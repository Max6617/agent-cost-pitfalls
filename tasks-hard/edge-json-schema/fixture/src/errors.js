/**
 * Failure entries and the one error the validator throws.
 *
 * A report entry is deliberately small: the gateway's client libraries key off
 * `path` and `keyword`, and the `message` is only ever read by a human.
 */

export class SchemaError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SchemaError'
  }
}

export function failure(path, keyword, message) {
  return { path, keyword, message }
}
