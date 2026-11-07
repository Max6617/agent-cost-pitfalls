import { CATALOGUE, catalogEntry } from './catalogue.js'
import { correlationOf } from './context.js'

/**
 * The failure type everything that crosses a module boundary is supposed to use.
 * See docs/error-policy.md - the catalogue owns the status and the retryability
 * of a code, the failure carries the context, and the cause is what it caught.
 */
export class DomainError extends Error {
  constructor(code, opts = {}) {
    super(opts.message ?? 'Something went wrong on our side.')
    this.name = 'DomainError'
    this.code = code
    this.status = opts.status ?? 500
    this.retryable = opts.retryable ?? true
    this.details = opts.details
    this.correlationId = opts.correlationId ?? null
    this.cause = opts.cause
  }
}

/** Raise a failure with a code from the catalogue. */
export function domainError(code, opts = {}) {
  return new DomainError(code, { ...opts, correlationId: opts.correlationId ?? correlationOf(opts.ctx) })
}

/**
 * Turn something we caught into a domain error of our own code, keeping the
 * context of the operation we are in.
 */
export function wrap(cause, code, opts = {}) {
  const message = cause instanceof Error ? cause.message : String(cause)
  return new DomainError(code, {
    details: opts.details,
    correlationId: opts.correlationId ?? correlationOf(opts.ctx),
    retryable: opts.retryable,
    message,
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
  return isDomainError(error) ? [error.code] : []
}

export { CATALOGUE, catalogEntry }
