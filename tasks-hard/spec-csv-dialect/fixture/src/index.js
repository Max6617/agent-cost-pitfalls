/**
 * delimited text - public surface.
 *
 * This is everything the import pipeline and the loader are allowed to import.
 * Modules under src/ that are not re-exported here are internal and may be
 * reorganised freely; the names below may not.
 */
export { parse } from './reader.js'
export { write } from './writer.js'
export { sniffDialect, countFields } from './sniff.js'
export { resolveDialect, DEFAULT_DIALECT, DELIMITERS, RAGGED_POLICIES } from './dialect.js'
export { ParseError } from './errors.js'
