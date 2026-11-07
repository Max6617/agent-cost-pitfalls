/**
 * The public surface of the gateway payload validator.
 *
 * Everything outside this file is an implementation detail; the tests and the
 * gateway both import from here.
 */
export { validate } from './validator.js'
export { SchemaError } from './errors.js'
export { TYPE_NAMES } from './types.js'
export { keywords } from './registry.js'
export { knownFormats } from './keywords/string.js'

/** The version of the subset this build implements (docs/schema-spec.md). */
export const SUBSET_VERSION = 4
