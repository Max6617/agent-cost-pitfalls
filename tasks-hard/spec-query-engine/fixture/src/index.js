/**
 * The public surface of the query engine.
 *
 * The reporting service, the saved-report builder and the CLI all import from
 * here and from nowhere else. Everything not named below is internal and may be
 * moved around; the names below may not.
 */
export { runQuery } from './engine.js'
export { validateQuery, ROOT } from './validate.js'
export { QueryError, ERROR_CODES } from './errors.js'
export { OPERATORS } from './condition.js'
export { AGGREGATE_OPS } from './aggregates.js'
