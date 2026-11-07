import { correlationOf } from './context.js'
import { domainError, wrap } from './errors.js'

/**
 * The outbound client. The transport is injected, so the client's whole job is
 * to turn whatever the far side did into something this service can report.
 */
export function createOutbound(transport) {
  return {
    send(request, { ctx, idempotent = true } = {}) {
      const correlationId = correlationOf(ctx)
      const outgoing = {
        ...request,
        headers: {
          ...(request && request.headers ? request.headers : {}),
          ...(correlationId === null ? {} : { 'x-correlation-id': correlationId }),
        },
      }

      // A condition the catalogue calls retryable is still not repeatable when
      // the operation is not idempotent: the code and the status are the
      // condition's, the flag is the decision.
      const repeatable = idempotent === false ? false : undefined

      let answer
      try {
        answer = transport(outgoing)
      } catch (cause) {
        throw wrap(cause, 'UPSTREAM_UNAVAILABLE', { ctx, retryable: repeatable })
      }

      const status = answer ? answer.status : 0
      if (status >= 200 && status < 300) return answer.body
      if (status === 404) throw domainError('NOT_FOUND', { ctx, message: 'the upstream has no such resource' })
      if (status === 409) throw domainError('DUPLICATE_JOB', { ctx, message: 'the upstream already has this request' })
      if (status === 429) throw domainError('RATE_LIMITED', { ctx, retryable: repeatable })
      if (status >= 500) throw domainError('UPSTREAM_UNAVAILABLE', { ctx, retryable: repeatable })
      throw domainError('UPSTREAM_REJECTED', { ctx, message: 'the upstream answered ' + status })
    },
  }
}
