/**
 * splitter - public surface.
 *
 * Everything the app and the tests are allowed to import. Modules under src/
 * that are not re-exported here are internal and may be reorganised freely;
 * the names below may not.
 */
export { Group, createGroup } from './group.js'
export { MODES } from './split.js'
export { isCents, sumCents, percentOf } from './money.js'
export { formatCents } from './util/format.js'
