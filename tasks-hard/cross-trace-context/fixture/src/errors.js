/**
 * Errors and the mapper that turns them into a response body.
 *
 * An error is raised while a span is running, so it carries the context that was
 * in flight at that moment. `mapError` is often called much later - from the
 * ingress frame, after the span it happened in has been left - and it must still
 * report the span the failure happened in, not the span that is mapping it.
 */
import { currentContext, fields, isContext } from './context.js'

export class AppError extends Error {
  constructor(message, { code = 'internal', status = 500, details, cause, context } = {}) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
    // The span the failure happened in, captured where the error was raised.
    // Kept on the error so the mapper does not have to guess from whatever span
    // happens to be running when it is asked for a body.
    this.context = context ?? currentContext()
  }
}

export class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'invalid-input', status: 400, ...options })
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'not-found', status: 404, ...options })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'conflict', status: 409, ...options })
    this.name = 'ConflictError'
  }
}

export class OutboundError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'outbound-failed', status: 502, ...options })
    this.name = 'OutboundError'
  }
}

export class RetryableError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'retryable', status: 503, ...options })
    this.name = 'RetryableError'
  }
}

export const isRetryable = (err) => Boolean(err) && err.code === 'retryable'

/** The chain of causes under `err`, innermost last. The error itself is first. */
export function causeChain(err) {
  const chain = []
  const seen = new Set()
  let node = err
  while (node && typeof node === 'object' && !seen.has(node)) {
    seen.add(node)
    chain.push(node)
    node = node.cause
  }
  return chain
}

const describe = (err) => ({
  name: typeof err?.name === 'string' ? err.name : 'Error',
  message: typeof err?.message === 'string' ? err.message : String(err),
  code: typeof err?.code === 'string' ? err.code : 'internal',
})

/**
 * The response body for a failed request.
 *
 * Shape (see docs/trace-context.md):
 *   { status, body: { error: { code, message, details }, trace, cause } }
 * `trace` is the span the failure happened in, `cause` is the flattened chain of
 * underlying failures, innermost last, each with its own code.
 */
export function mapError(err) {
  const chain = causeChain(err)
  return {
    status: err?.status ?? 500,
    body: {
      error: {
        code: err?.code ?? 'internal',
        message: typeof err?.message === 'string' ? err.message : String(err),
        details: err?.details ?? undefined,
      },
      // The span the failure is being reported under. A failure raised under a
      // span that has already been left is still reported by the frame that is
      // handing it to the client.
      trace: fields(null),
      cause: chain.map(describe),
    },
  }
}
