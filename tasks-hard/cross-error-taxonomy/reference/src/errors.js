import { CATALOGUE, catalogEntry } from './catalogue.js'
import { correlationOf } from './context.js'

/**
 * The failure type everything that crosses a module boundary is supposed to use.
 * See docs/error-policy.md - the catalogue owns the status and the retryability
 * of a code, the failure carries the context, and the cause is what it caught.
 */
export class DomainError extends Error {
  constructor(code, opts = {}) {
    const entry = catalogEntry(code) ?? CATALOGUE.INTERNAL
    super(opts.message ?? entry.message)
    this.name = 'DomainError'
    this.code = catalogEntry(code) ? code : 'INTERNAL'
    this.status = entry.status
    this.retryable = entry.retryable && opts.retryable !== false
    this.clientMessage = entry.message
    this.details = opts.details
    this.correlationId = opts.correlationId ?? null
    if (opts.cause !== undefined) this.cause = opts.cause
  }
}

/** Raise a failure with a code from the catalogue. */
export function domainError(code, opts = {}) {
  return new DomainError(code, { ...opts, correlationId: opts.correlationId ?? correlationOf(opts.ctx) })
}

/**
 * Turn something we caught into a domain error of our own code, keeping the
 * value we caught and the context of the operation we are in. A wrapper with no
 * context of its own inherits the correlation id of the failure it caught.
 */
export function wrap(cause, code, opts = {}) {
  const message = cause instanceof Error ? cause.message : String(cause)
  const inherited = isDomainError(cause) ? cause.correlationId : null
  return new DomainError(code, {
    message,
    cause,
    details: opts.details,
    correlationId: opts.correlationId ?? correlationOf(opts.ctx) ?? inherited,
    retryable: opts.retryable,
  })
}

/** Is this one of ours? Codes are ours; anything else is somebody else's. */
export function isDomainError(value) {
  return value instanceof DomainError
}

/**
 * The codes of the chain, outermost first. The walk stops as soon as it reaches
 * something that is not a domain error, which has no code to report.
 */
export function chainOf(error) {
  const codes = []
  let current = error
  while (isDomainError(current)) {
    codes.push(current.code)
    current = current.cause
  }
  return codes
}

export { CATALOGUE, catalogEntry }
