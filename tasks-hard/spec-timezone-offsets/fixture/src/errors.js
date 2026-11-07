/**
 * The two errors the public surface is allowed to raise.
 *
 * Both carry a `code` so that callers (the site importer, the retry worker) can
 * branch on the kind of failure without matching on the message.
 */

/** A zone that is neither a table key nor an offset string. */
export class UnknownZoneError extends Error {
  constructor(zone) {
    super('unknown zone: ' + String(zone))
    this.name = 'UnknownZoneError'
    this.code = 'UNKNOWN_ZONE'
    this.zone = zone
  }
}

/** A duration the service cannot apply, or cannot apply to that argument. */
export class InvalidDurationError extends Error {
  constructor(message, code = 'INVALID_DURATION') {
    super(message)
    this.name = 'InvalidDurationError'
    this.code = code
  }
}
