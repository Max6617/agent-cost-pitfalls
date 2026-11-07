/**
 * The one error type the API throws.
 *
 * Every failure that reaches the HTTP layer is a `StoreError`: it carries a
 * stable `code` the client can branch on, an HTTP status the framework reads
 * without guessing, and an optional `details` object for field-level problems.
 *
 * Modules must throw this. A bare `throw new Error('not found')` is a bug: the
 * framework has to parse the message to pick a status, and the message is a
 * sentence that somebody will reword next quarter.
 */

/** Codes, with the status each maps to. The table is the contract. */
export const CODES = {
  NOT_FOUND: 404,
  OUT_OF_STOCK: 409,
  INVALID_INPUT: 422,
  PAYMENT_DECLINED: 402,
  CART_EMPTY: 400,
  RATE_LIMITED: 429,
  UPSTREAM_FAILED: 502,
}

export class StoreError extends Error {
  /**
   * @param {keyof CODES} code
   * @param {string} message
   * @param {{ details?: object, cause?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'StoreError'
    this.code = code
    this.status = CODES[code] ?? 500
    this.details = options.details ?? null
    if (options.cause) this.cause = options.cause
  }

  /** The wire form. `code` is what clients branch on, never the message. */
  toJSON() {
    return { error: this.code, message: this.message, details: this.details }
  }
}

/** Throw a `StoreError`. The only way modules are allowed to fail. */
export function fail(code, message, options) {
  throw new StoreError(code, message, options)
}

/** Is this one of ours? */
export function isStoreError(error) {
  return error instanceof StoreError
}

/**
 * Turn any thrown value into a response.
 *
 * An unknown error becomes a 500 with a generic body — never the message, which
 * may contain a connection string.
 */
export function toHttp(error) {
  if (isStoreError(error)) {
    return { status: error.status, body: error.toJSON() }
  }
  return { status: 500, body: { error: 'INTERNAL', message: 'internal error', details: null } }
}
