/**
 * The background worker.
 *
 * A worker job is not a continuation of anything: it is picked off a queue and
 * it is the beginning of its own work. Every attempt therefore starts a new
 * trace, and a job that is enqueued while a request is being served does not
 * turn the request's trace into a trace that spans two unrelated pieces of work.
 *
 * `runJob` is the isolation boundary. Callers that need the attempt loop as well
 * use `createWorker`, which retries through the same boundary once per attempt.
 */
import { contextOrAnonymous } from './context.js'
import { rootSpan, runInSpan } from './tracing.js'

/** Re-exported so a caller can open the span a job will run in. */
export { rootSpan }

export const DEFAULT_MAX_ATTEMPTS = 3

/** Run one job, with one attempt, in a trace of its own. */
export function runJob(job, handler, { events, idGen } = {}) {
  if (!job || typeof job.name !== 'string') throw new TypeError('a job needs a name')
  if (typeof handler !== 'function') throw new TypeError('runJob needs a handler')

  // A job begins its own work. Whatever span was in flight when the job was
  // enqueued belongs to somebody else and is not this job's parent.
  const span = job.span ?? contextOrAnonymous()

  return runInSpan(span, async () => {
    events?.emit({ name: 'worker.attempt', meta: { job: job.name, attempt: job.attempt ?? 1 } })
    try {
      const result = await handler({ name: job.name, payload: job.payload ?? {}, attempt: job.attempt ?? 1 })
      events?.emit({ name: 'worker.finished', meta: { job: job.name, attempt: job.attempt ?? 1, ok: true } })
      return result
    } catch (err) {
      events?.emit({
        name: 'worker.failed',
        meta: { job: job.name, attempt: job.attempt ?? 1, code: err?.code ?? 'error' },
      })
      throw err
    }
  })
}

export function createWorker({ handler, events, idGen, maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
  if (typeof handler !== 'function') throw new TypeError('createWorker needs a handler')

  return {
    /** Every attempt re-enters `runJob`, so every attempt gets a fresh trace. */
    async run(job) {
      let last
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await runJob({ ...job, attempt }, handler, { events, idGen })
        } catch (err) {
          last = err
        }
      }
      throw last
    },

    get maxAttempts() {
      return maxAttempts
    },
  }
}
