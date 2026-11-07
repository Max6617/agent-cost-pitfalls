/**
 * The dialect: what separates the fields, what quotes them, how the lines end.
 *
 * A dialect travels as a plain object, because it is read out of
 * config/import.config.json and passed around between the importer, the loader
 * and the tests. Callers hand over the keys they care about and
 * `resolveDialect()` fills in the rest - and refuses the combinations that
 * cannot be honoured, before a single character is read.
 */

export const DELIMITERS = [',', ';', '\t', '|']

export const RAGGED_POLICIES = ['error', 'pad', 'truncate', 'ignore']

export const DEFAULT_DIALECT = Object.freeze({
  delimiter: ',',
  quote: '"',
  escape: '"',
  eol: '\r\n',
  header: true,
  trim: false,
  ragged: 'error',
  rename: null,
})

/** Drop the keys a caller left out, so an override cannot erase a default. */
function defined(options) {
  const out = {}
  for (const [key, value] of Object.entries(options ?? {})) {
    if (value !== undefined) out[key] = value
  }
  return out
}

function assertCharacter(name, value, nullable = false) {
  if (nullable && value === null) return
  if (typeof value !== 'string' || value.length !== 1) {
    throw new TypeError(name + ' must be a single character')
  }
  if (value === '\r' || value === '\n') {
    throw new TypeError(name + ' may not be a line ending')
  }
}

function assertHeader(header) {
  if (header === true || header === false) return
  if (!Array.isArray(header)) throw new TypeError('header must be true, false, or an array of names')
  for (const name of header) {
    if (typeof name !== 'string') throw new TypeError('every supplied column name must be a string')
  }
}

function assertRename(rename) {
  if (rename === null) return
  if (typeof rename !== 'object' || Array.isArray(rename)) {
    throw new TypeError('rename must be an object of column names, or null')
  }
  for (const [from, to] of Object.entries(rename)) {
    if (typeof from !== 'string' || from === '') throw new TypeError('rename keys must be column names')
    if (to !== null && to !== undefined && typeof to !== 'string') {
      throw new TypeError('a rename target must be a column name or null')
    }
  }
}

/**
 * The dialect actually used for one read or one write: the defaults, with the
 * caller's keys on top, checked.
 */
export function resolveDialect(options = {}) {
  const given = defined(options)
  const dialect = { ...DEFAULT_DIALECT, ...given }

  assertCharacter('delimiter', dialect.delimiter)
  assertCharacter('quote', dialect.quote, true)
  assertCharacter('escape', dialect.escape)
  if (dialect.delimiter === dialect.quote) {
    throw new TypeError('delimiter and quote must be different characters')
  }
  if (dialect.delimiter === dialect.escape) {
    throw new TypeError('delimiter and escape must be different characters')
  }
  if (dialect.eol !== '\n' && dialect.eol !== '\r\n') {
    throw new TypeError("eol must be '\\n' or '\\r\\n'")
  }
  if (typeof dialect.trim !== 'boolean') throw new TypeError('trim must be true or false')
  if (!RAGGED_POLICIES.includes(dialect.ragged)) {
    throw new TypeError('ragged must be one of ' + RAGGED_POLICIES.join(', '))
  }
  assertHeader(dialect.header)
  assertRename(dialect.rename)

  if (Array.isArray(dialect.header)) dialect.header = dialect.header.slice()
  return dialect
}
