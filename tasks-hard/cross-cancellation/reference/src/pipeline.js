import { resolveConfig } from './config.js'
import { createCache } from './cache.js'
import { createRateLimiter } from './limiter.js'
import { createQueue } from './queue.js'
import { createAuditLog } from './record.js'
import { createPolicy } from './policy.js'
import { callUpstream, withRetry, withTimeout } from './resilience.js'
import { createToken, createDeadlineToken, linkTokens, isCancellation } from './tokens.js'
import { authStage, cacheStage, limitStage, queueStage, upstreamStage } from './stages.js'
import { createClock, immediateSleep } from './util/clock.js'
import { nextId } from './util/ids.js'
import { warn } from './util/log.js'
import { DeniedError, RateLimitedError } from './errors.js'

/**
 * The gateway.
 *
 * `createPipeline` wires the stages together and owns the one decision the
 * stages are not allowed to make: whether the run may go on. Everything a stage
 * touches - cache, limiter, queue, upstream, clock, sleep - is injected, so a
 * run is fully determined by its arguments.
 *
 * The trace in the result is the interesting part: `stages` lists every stage
 * that executed, in order, and it always ends with `record` and `cleanup`. A
 * stage that never ran is not in it.
 */
export function createPipeline(options = {}) {
  const config = resolveConfig(options.config)
  const clock = options.clock ?? createClock()
  const sleep = options.sleep ?? immediateSleep
  const tokenFactory = options.tokenFactory ?? createToken
  const services = {
    cache: options.cache ?? createCache(),
    limiter: options.limiter ?? createRateLimiter({ capacity: config.limiter.capacity ?? 4 }),
    queue: options.queue ?? createQueue(),
    upstream: options.upstream ?? (() => Promise.resolve(null)),
    audit: options.audit ?? createAuditLog(),
    dequeue: () => services.queue.claim(),
  }
  const policy = createPolicy(options.policy)

  return {
    config,
    services,
    clock,

    async run(input = {}) {
      const request = {
        route: input.route ?? '/v1/echo',
        tenant: input.tenant ?? 'anon',
        query: input.query ?? {},
        apiKey: input.apiKey ?? null,
      }

      /**
       * The run's token: the caller's, the deadline's, or both as one. A
       * deadline a caller passed as a plain number is read on this pipeline's
       * clock, so the boundary is the same one the injection point uses.
       */
      const sources = [input.token ?? (input.token === null ? null : options.token ?? null)].filter(Boolean)
      const deadline = input.deadline ?? options.deadline
      if (deadline !== undefined && deadline !== null) {
        sources.push(deadline instanceof Object && 'aborted' in deadline ? deadline : createDeadlineToken(deadline, clock))
      }
      let token
      if (!sources.length) token = tokenFactory()
      else if (sources.length === 1) token = sources[0]
      else token = linkTokens(...sources)

      const ref = input.ref ?? nextId('req')
      const ctx = { ref, request, policy, services, state: {} }
      const trace = []
      const releases = []
      let attempts = 0
      let finished = false

      const checkpoint = (stage) => {
        if (!token.aborted) return
        throw new Halt(stage, token.reason ?? 'aborted')
      }

      const mark = (name) => {
        trace.push(name)
      }

      /** Run one stage: check, mark, run, file the stage's own undo. */
      const step = async (fn, name) => {
        checkpoint(name)
        mark(name)
        // Diagnostics only: the hook observes where the run is. It cannot
        // change the outcome - the checkpoint after the stage is what decides.
        input.onStage?.(name)
        const out = await fn(ctx, token)
        if (out.release) releases.push(out.release)
        checkpoint(name)
        return out
      }

      const release = () => {
        while (releases.length) {
          const undo = releases.pop()
          try {
            undo()
          } catch (err) {
            warn('release failed', err?.message)
          }
        }
      }

      /**
       * The last two steps of every run, cancelled or not. They are steps, not
       * stages: docs/pipeline-policy.md section 4 requires the record to be
       * written for a cancelled run too, so nothing a caller can abort may stand
       * between a request and its audit line.
       */
      const finalize = (outcome) => {
        if (finished) return
        finished = true
        // Every undo runs even though the token is already aborted: a release
        // that consults the token and skips its work is not a release.
        release()
        if (outcome.status === 'completed') {
          if (ctx.state.wrote !== null && !outcome.reused) services.cache.put(ctx.state.wrote, outcome.response)
          if (ctx.state.wrote !== null) services.cache.settle(ctx.state.wrote)
          services.audit.complete({ ref, reused: outcome.reused, attempts, response: outcome.response })
        } else if (outcome.status === 'cancelled') {
          services.audit.cancel(outcome.reason, outcome.stage)
        } else if (outcome.status === 'denied') {
          services.audit.deny(outcome.reason)
        } else {
          services.audit.fail(outcome.kind ?? 'failed', outcome.message ?? null)
        }
        mark('record')
        mark('cleanup')
      }

      const cancelled = (stage, reason) => {
        const result = {
          status: 'cancelled',
          cancelled: true,
          stage,
          reason,
          committed: false,
          stages: trace,
          ref,
          attempts,
          reused: false,
          response: null,
        }
        finalize(result)
        return result
      }

      const completed = (response) => {
        const result = {
          status: 'completed',
          cancelled: false,
          stage: null,
          reason: null,
          committed: true,
          stages: trace,
          ref,
          attempts,
          reused: false,
          response,
        }
        finalize(result)
        return result
      }

      try {
        checkpoint('ingress')

        await step(authStage, 'auth')

        const cached = await step(cacheStage, 'cache')
        if (cached.value.hit) {
          const result = {
            status: 'completed',
            cancelled: false,
            stage: null,
            reason: null,
            committed: true,
            stages: trace,
            ref,
            attempts: 0,
            reused: true,
            response: cached.value.value,
          }
          finalize(result)
          return result
        }
        ctx.state.wrote = cached.value.key

        const limited = await step(limitStage, 'limit')
        if (limited.value.limited) throw new RateLimitHalt('limit', new RateLimitedError(limited.value.key))

        await step(queueStage, 'queue')
        await step(upstreamStage, 'upstream')

        const attempt = () =>
          callUpstream(token, {
            upstream: services.upstream,
            request,
            timeout: config.timeoutMs,
            sleep,
            clock,
          })

        const response = await withRetry(
          token,
          () => {
            attempts += 1
            return withTimeout(token, attempt, { timeout: config.timeoutMs, clock, sleep })
          },
          { retry: { ...config.retry, retryable: policy.retryable }, sleep },
        )
        checkpoint('upstream')

        return completed(response)
      } catch (err) {
        if (err instanceof Halt) return cancelled(err.stage, err.reason)
        if (isCancellation(err)) return cancelled('upstream', err.reason ?? 'aborted')
        if (err instanceof RateLimitHalt) {
          finalize({ status: 'rate-limited', kind: 'rate-limited', message: err.error.message })
          throw err.error
        }
        if (err instanceof DeniedError) {
          finalize({ status: 'denied', reason: err.reason })
          throw err
        }
        finalize({ status: 'failed', kind: err?.kind ?? 'failed', message: err?.message ?? String(err) })
        throw err
      }
    },
  }
}

/**
 * The pipeline's own stop signal. A stage that is already running when the token
 * trips surfaces as one of these at the next checkpoint, which is how a
 * cancellation observed *inside* a stage is still attributed to that stage.
 */
class Halt extends Error {
  constructor(stage, reason) {
    super('cancelled at ' + stage)
    this.name = 'Halt'
    this.stage = stage
    this.reason = reason
  }
}

class RateLimitHalt extends Error {
  constructor(stage, error) {
    super(error.message)
    this.name = 'RateLimitHalt'
    this.stage = stage
    this.error = error
  }
}
