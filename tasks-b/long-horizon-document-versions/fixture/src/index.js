/**
 * The public surface of the document service.
 *
 * Everything a caller is allowed to import. Modules under src/ that are not
 * re-exported here are internal and may be reorganised freely; the names below
 * may not change.
 */
export { createDocumentService } from './service.js'
export * as statuses from './errors.js'
