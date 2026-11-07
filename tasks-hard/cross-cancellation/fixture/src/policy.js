import { limiterKey } from './util/keys.js'
import { isCancellation } from './tokens.js'

/**
 * Caller policy: who may call, which bucket they count against, and which
 * failures are worth another attempt.
 *
 * The defaults are what the gateway ships with; `createPipeline({ policy })`
 * replaces them wholesale, which is how the conformance tests drive a denied or
 * a flaky upstream without a network.
 */
export function createPolicy(options = {}) {
  return {
    /** token -> principal, or null. A principal needs `id` and `tenant`. */
    authenticate:
      options.authenticate ??
      ((request) => (request.apiKey ? { id: request.apiKey, tenant: request.tenant ?? 'anon' } : null)),

    /** The limiter bucket this caller counts against. */
    limiterKeyFor: options.limiterKeyFor ?? ((request, principal) => limiterKey(request, principal)),

    /** Is this failure worth another attempt? */
    retryable: options.retryable ?? ((err) => err?.kind === 'upstream'),
  }
}

export { isCancellation }
