import { correlationOf } from './context.js'
import { domainError, wrap } from './errors.js'

/**
 * The job publisher. The broker is a single injected function that takes the
 * envelope and answers with a status, the same shape the outbound client's
 * transport uses.
 *
 * The envelope is validated before the broker is touched: enqueuing a job the
 * queue cannot name is worse than refusing it, because nobody can find it later.
 */
export function createPublisher(broker) {
  return {
    publish(topic, payload, { ctx, idempotent = true } = {}) {
      const jobId = payload ? payload.jobId : undefined
      if (typeof jobId !== 'string' || jobId === '') {
        throw domainError('VALIDATION_FAILED', {
          ctx,
          message: 'the job has no jobId',
          details: { fields: ['jobId'] },
        })
      }

      const envelope = { topic, jobId, payload, correlationId: correlationOf(ctx) }
      const repeatable = idempotent === false ? false : undefined

      let answer
      try {
        answer = broker(envelope)
      } catch (cause) {
        throw wrap(cause, 'DEPENDENCY_UNAVAILABLE', { ctx, retryable: repeatable })
      }

      const status = answer ? answer.status : 0
      if (status >= 200 && status < 300) return { accepted: true, envelope }
      if (status === 409) throw domainError('DUPLICATE_JOB', { ctx, message: 'the broker already has job ' + jobId })
      throw domainError('DEPENDENCY_UNAVAILABLE', {
        ctx,
        message: 'the broker answered ' + status,
        details: { status },
        retryable: repeatable,
      })
    },
  }
}
