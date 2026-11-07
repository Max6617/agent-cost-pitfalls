/**
 * The dialect: what separates the fields, what quotes them, how the lines end.
 *
 * A dialect travels as a plain object, because it is read out of
 * config/import.config.json and passed around between the importer, the loader
 * and the tests. Callers hand over the keys they care about and
 * `resolveDialect()` fills in the rest.
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

/**
 * The dialect actually used for one read or one write: the defaults, with the
 * caller's keys on top.
 */
export function resolveDialect(options = {}) {
  const given = defined(options)
  const dialect = { ...DEFAULT_DIALECT, ...given }
  if (Array.isArray(dialect.header)) dialect.header = dialect.header.slice()
  return dialect
}
