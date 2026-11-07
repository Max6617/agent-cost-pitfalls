/**
 * Errors the router raises. Both carry the text that caused them so that a
 * caller can quote it back to the user without re-parsing anything.
 */

/** A pattern that cannot be routed: raised by `add()`, never by `match()`. */
export class RouteError extends Error {
  constructor(message, pattern = null) {
    super(message)
    this.name = 'RouteError'
    this.pattern = pattern
  }
}

/**
 * A request target that carries a percent escape which is not valid. Raised by
 * `match()`; the offending text is on `raw`.
 */
export class MalformedEscapeError extends Error {
  constructor(message, raw = null) {
    super(message)
    this.name = 'MalformedEscapeError'
    this.raw = raw
  }
}
