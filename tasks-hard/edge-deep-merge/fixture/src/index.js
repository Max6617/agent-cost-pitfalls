/**
 * layered-config - public surface.
 *
 * Everything the config service and the CLI are allowed to import. Modules under
 * src/ that are not re-exported here are internal and may be reorganised freely;
 * the names below may not change and may not move.
 */
export { merge } from './merge.js'
export { patch, describePatch } from './patch.js'
export { diff, deepEqual, isEmptyDiff } from './diff.js'
export { clone, countContainers } from './clone.js'
export { isPlainObject, isRecord, hasOwn, describe } from './types.js'
export { DANGEROUS_KEYS, REMOVED, isDangerousKey, isRemoved } from './symbols.js'
export { getPath, flatten, formatPath, depthOf } from './view.js'
export { readKey } from './util/keys.js'
export { loadDefaults, readJson, repoRoot, repoPath } from './config.js'
