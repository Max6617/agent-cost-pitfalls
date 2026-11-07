import { correlationOf } from './context.js'
import { domainError, isDomainError } from './errors.js'
import { mapError } from './mapper.js'

/**
 * The job worker. It runs one job and records what happened: the queue is what
 * decides whether to hand it back, and it decides from the record.
 */
export function runJob(job, handler, { ctx } = {}) {
  const jobId = job ? job.jobId : undefined
  if (typeof jobId !== 'string' || jobId === '') {
    throw domainError('VALIDATION_FAILED', {
      ctx,
      message: 'the job has no jobId',
      details: { fields: ['jobId'] },
    })
  }

  try {
    return { jobId, status: 'ok', value: handler(job), correlationId: correlationOf(ctx) }
  } catch (error) {
    // A job records the failure in the same shape the API would answer with,
    // so that the queue, the log and the client are all reading one thing.
    const failure = isDomainError(error)
      ? error
      : domainError('JOB_FAILED', {
        ctx,
        message: String(error && error.message ? error.message : error),
        cause: error,
      })
    const mapped = mapError(failure, { ctx })
    return { jobId, status: 'failed', error: mapped, willRetry: mapped.retryable === true }
  }
}
