import { SchemaError, failure } from '../errors.js'

const isString = (value) => typeof value === 'string'

/**
 * How many code points the string holds. A UTF-16 unit is not a character:
 * `'😀'` is one code point and two units, and the length limits are written in
 * the units the client thinks in.
 */
function codePoints(text) {
  return [...text].length
}

/** `minLength` — how short a string may be. */
export function minLength(schema, value, path, errors) {
  if (!isString(value)) return
  if (codePoints(value) < schema.minLength) {
    errors.push(failure(path, 'minLength', `needs at least ${schema.minLength} characters`))
  }
}

/** `maxLength` — how long a string may be. */
export function maxLength(schema, value, path, errors) {
  if (!isString(value)) return
  if (codePoints(value) > schema.maxLength) {
    errors.push(failure(path, 'maxLength', `takes at most ${schema.maxLength} characters`))
  }
}

/** `pattern` — a regular expression the string has to match. */
export function pattern(schema, value, path, errors) {
  if (!isString(value)) return
  // The expression is a search over the string, so it is compiled as written:
  // `b` matches `abc`, and an anchored match is spelled `^b`.
  let expression
  try {
    expression = new RegExp(schema.pattern)
  } catch {
    throw new SchemaError(`"${schema.pattern}" is not a valid regular expression`)
  }
  if (!expression.test(value)) {
    errors.push(failure(path, 'pattern', `must match ${schema.pattern}`))
  }
}

const FORMATS = {
  email: (text) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text),
  date: (text) => /^\d{4}-\d{2}-\d{2}$/.test(text),
  uuid: (text) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text),
}

/**
 * `format` — an annotation in this subset. The gateway accepts it, never
 * enforces it and never fails a payload over it; the service teams use it for
 * documentation, and the formats below are only here for the lint command.
 */
export function format() {}

/** The formats this build knows about, for the lint command. */
export function knownFormats() {
  return Object.keys(FORMATS)
}
