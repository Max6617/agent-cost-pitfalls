/**
 * The two policy errors the service can raise. Both carry the offending name
 * on the instance so callers can route them without parsing the message.
 */
export class MissingKeyError extends Error {
  constructor(key, locale) {
    super(`no message for key "${key}" in locale "${locale}"`)
    this.name = 'MissingKeyError'
    this.key = key
    this.locale = locale
  }
}

export class MissingValueError extends Error {
  constructor(placeholder, key) {
    super(key === undefined
      ? `no value for placeholder "${placeholder}"`
      : `no value for placeholder "${placeholder}" in message "${key}"`)
    this.name = 'MissingValueError'
    this.placeholder = placeholder
    this.key = key
  }
}
