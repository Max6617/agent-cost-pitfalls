/**
 * The scheduler engine.
 *
 * It decides, and it records; it never executes anything and it never waits. A
 * tick takes the instant it is being taken at, hands the runs it wants started
 * back to the caller, and the caller reports the outcome with `finish`.
 *
 * Everything the scheduler decides is derived from - and recorded against - the
 * instants it was given, so replaying the same calls in the same order rebuilds
 * the same history.
 */
import { backoffFor, maxAttempts } from './backoff.js'
import { selectRuns } from './catchup.js'
import { loadConfig, loadJobs, loadOffsets } from './config.js'
import { createHistory } from './history.js'
import { normalizeJob } from './jobs.js'
import { isMisfired } from './misfire.js'
import { planRuns } from './planner.js'
import { createPools } from './pools.js'
import { compareJobs } from './priority.js'
import { instantsBetween } from './schedule.js'
import { parseInstant, toIso } from './time.js'
import { advanceWatermark } from './watermark.js'

export class Scheduler {
  #config
  #offsets
  #pools
  #states = new Map()
  #history = createHistory()
  #registeredAt

  constructor({ config = loadConfig(), offsets = loadOffsets(), jobs = [], now } = {}) {
    if (now === undefined || now === null) {
      throw new TypeError('the scheduler has no clock of its own: pass the instant to start from as `now`')
    }
    this.#config = config
    this.#offsets = offsets
    this.#registeredAt = parseInstant(now, 'now')
    this.#pools = createPools(config)
    for (const spec of jobs) this.addJob(spec, { now: this.#registeredAt })
  }

  /**
   * Register a job. Runs scheduled at or before the registration instant are not
   * replayed: the job's watermark starts where it is added.
   */
  addJob(spec, { now } = {}) {
    const at = now === undefined ? this.#registeredAt : parseInstant(now, 'now')
    const job = normalizeJob(spec, this.#config)
    if (this.#states.has(job.id)) throw new RangeError('duplicate job id ' + JSON.stringify(job.id))
    this.#states.set(job.id, {
      job,
      watermark: at,
      running: false,
      run: null,
      attempt: 0,
      retryAt: null,
      parked: false,
      status: 'registered',
    })
    this.#pools.register(job)
    return job
  }

  jobs() {
    return this.#order().map((state) => state.job)
  }

  /** The public view of one job's state. Never hand out the live object. */
  state(jobId) {
    const state = this.#require(jobId)
    return {
      id: state.job.id,
      watermark: state.watermark,
      running: state.running,
      parked: state.parked,
      attempts: state.attempt,
      pendingRetryAt: state.retryAt,
      currentRunAt: state.run ? state.run.at : null,
      lastStatus: state.status,
    }
  }

  states() {
    return this.#order().map((state) => this.state(state.job.id))
  }

  /**
   * Look at every job as of `now` and do whatever is due. Returns the history
   * entries this tick recorded, in the order it took the decisions.
   */
  tick(now) {
    const at = parseInstant(now, 'now')
    const actions = []
    for (const state of this.#order()) {
      if (!state.job.enabled || state.parked) continue
      actions.push(...this.#advance(state, at))
    }
    return actions
  }

  /** Report the outcome of the attempt that is currently in flight. */
  finish(jobId, { at, ok = true, reason } = {}) {
    const state = this.#require(jobId)
    if (!state.running || !state.run) throw new Error('job ' + jobId + ' is not running')
    if (at === undefined) throw new TypeError('finish needs the instant the run ended: pass `at`')
    const finishedAt = parseInstant(at, 'at')
    const run = state.run

    this.#history.amend(run.entry.seq, {
      status: ok ? 'succeeded' : 'failed',
      reason: reason ?? (ok ? 'ok' : 'error'),
      finishedAt,
    })
    this.#pools.release(this.#pools.get(state.job), jobId)
    state.running = false
    state.status = ok ? 'succeeded' : 'failed'

    if (ok) {
      state.run = null
      state.attempt = 0
      state.retryAt = null
      return { status: 'succeeded' }
    }

    if (state.attempt < maxAttempts(state.job)) {
      state.retryAt = finishedAt + backoffFor(state.job, state.attempt + 1)
      return { status: 'retry-scheduled', attempt: state.attempt, retryAt: state.retryAt }
    }

    state.retryAt = null
    state.parked = true
    state.run = null
    const entry = this.#record(finishedAt, {
      jobId,
      at: run.at,
      status: 'parked',
      reason: 'attempts-exhausted',
      attempt: state.attempt,
    })
    return { status: 'parked', attempt: state.attempt, entry }
  }

  /** Take a parked job back into service. */
  resume(jobId) {
    const state = this.#require(jobId)
    state.parked = false
    state.attempt = 0
    state.retryAt = null
    state.run = null
    state.status = 'resumed'
    return this.state(jobId)
  }

  /**
   * The runs each job still owes, from its watermark to `now + windowMs`, at
   * most `perJob` per job, ascending by instant.
   */
  planNext(now, windowMs = 0, options = {}) {
    const at = parseInstant(now, 'now')
    const until = at + Math.max(0, Number(windowMs ?? 0))
    const perJob = options.perJob ?? 3
    const only = options.jobIds ? new Set(options.jobIds) : null
    const out = []
    for (const state of this.#order()) {
      if (!state.job.enabled || state.parked) continue
      if (only && !only.has(state.job.id)) continue
      for (const planned of planRuns(state.job, state, until, perJob, this.#offsets)) {
        out.push({
          jobId: state.job.id,
          pool: state.job.pool,
          priority: state.job.priority,
          at: planned.at,
          iso: toIso(planned.at),
          overdue: planned.at <= at,
          retry: planned.retry,
          attempt: planned.attempt,
        })
      }
    }
    return out.sort((a, b) => a.at - b.at)
  }

  history(options) {
    return this.#history.list(options)
  }

  #require(jobId) {
    const state = this.#states.get(jobId)
    if (!state) throw new RangeError('no such job: ' + JSON.stringify(jobId))
    return state
  }

  /** The order the contract fixes: priority, then submission order, then id. */
  #order() {
    return [...this.#states.values()].sort((a, b) => compareJobs(a.job, b.job))
  }

  #record(now, fields) {
    return this.#history.append({ recordedAt: now, ...fields })
  }

  #start(state, now, at, attempt, actions) {
    this.#pools.acquire(this.#pools.get(state.job), state.job.id)
    const entry = this.#record(now, {
      jobId: state.job.id,
      at,
      status: 'started',
      reason: attempt > 1 ? 'retry' : 'scheduled',
      attempt,
    })
    state.running = true
    state.attempt = attempt
    state.retryAt = null
    state.run = { at, attempt, entry }
    state.status = 'running'
    actions.push(entry)
    return entry
  }

  #defer(now, state, at, reason, actions, owed) {
    owed.push(at)
    actions.push(this.#record(now, { jobId: state.job.id, at, status: 'deferred', reason, attempt: 0 }))
  }

  #settle(state, now, candidates, owed, actions) {
    state.watermark = advanceWatermark(state.watermark, now, candidates, owed)
    return actions
  }

  #advance(state, now) {
    const job = state.job
    const actions = []
    const candidates = instantsBetween(job.schedule, state.watermark, now, this.#offsets)
    const owed = []

    // A run in flight is not settled yet, so nothing behind it can be either.
    if (state.running) {
      for (const at of candidates) this.#defer(now, state, at, 'job-running', actions, owed)
      return this.#settle(state, now, candidates, owed, actions)
    }

    if (state.retryAt !== null) {
      if (now < state.retryAt) {
        for (const at of candidates) this.#defer(now, state, at, 'retry-pending', actions, owed)
        return this.#settle(state, now, candidates, owed, actions)
      }
      // The retry is due. It is the same run, so it keeps the instant it was
      // scheduled for; anything else the job owes waits for the next tick.
      this.#start(state, now, state.run.at, state.attempt + 1, actions)
      for (const at of candidates) this.#defer(now, state, at, 'retry-pending', actions, owed)
      return this.#settle(state, now, candidates, owed, actions)
    }

    const onTime = []
    for (const at of candidates) {
      if (isMisfired(job, at, now)) {
        actions.push(this.#record(now, {
          jobId: job.id, at, status: 'misfired', reason: 'misfire-window', attempt: 0,
        }))
      } else {
        onTime.push(at)
      }
    }

    const { start, settled } = selectRuns(job, onTime)
    for (const decision of settled) {
      actions.push(this.#record(now, {
        jobId: job.id, at: decision.at, status: decision.status, reason: decision.reason, attempt: 0,
      }))
    }

    const pool = this.#pools.get(job)
    for (const at of start) {
      if (state.running) {
        this.#defer(now, state, at, 'job-running', actions, owed)
      } else if (!this.#pools.hasCapacity(pool)) {
        this.#defer(now, state, at, 'pool-full', actions, owed)
      } else {
        this.#start(state, now, at, 1, actions)
      }
    }
    return this.#settle(state, now, candidates, owed, actions)
  }
}

/**
 * A scheduler wired to this checkout's configuration, offset table and job list.
 * Every option can be overridden, which is how the harness replays a scenario.
 */
export function createScheduler({ jobs, now, config, offsets } = {}) {
  return new Scheduler({
    jobs: jobs ?? loadJobs(),
    now,
    config: config ?? loadConfig(),
    offsets: offsets ?? loadOffsets(),
  })
}
