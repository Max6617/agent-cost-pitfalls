import { failure } from '../errors.js'

const isString = (value) => typeof value === 'string'

/** `minLength` — how short a string may be. */
export function minLength(schema, value, path, errors) {
  if (!isString(value)) return
  if (value.length < schema.minLength) {
    errors.push(failure(path, 'minLength', `needs at least ${schema.minLength} characters`))
  }
}

/** `maxLength` — how long a string may be. */
export function maxLength(schema, value, path, errors) {
  if (!isString(value)) return
  if (value.length > schema.maxLength) {
    errors.push(failure(path, 'maxLength', `takes at most ${schema.maxLength} characters`))
  }
}

/** `pattern` — a regular expression the string has to match. */
export function pattern(schema, value, path, errors) {
  if (!isString(value)) return
  const expression = new RegExp(schema.pattern)
  if (!expression.test(value)) {
    errors.push(failure(path, 'pattern', `must match ${schema.pattern}`))
  }
}

const FORMATS = {
  email: (text) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text),
  date: (text) => /^\d{4}-\d{2}-\d{2}$/.test(text),
  uuid: (text) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text),
}

/** `format` — the shapes the services asked us to recognise. */
export function format(schema, value, path, errors) {
  const check = FORMATS[schema.format]
  if (!check || !isString(value)) return
  if (!check(value)) {
    errors.push(failure(path, 'format', `must be a valid ${schema.format}`))
  }
}

/** The formats this build knows about, for the lint command. */
export function knownFormats() {
  return Object.keys(FORMATS)
}
