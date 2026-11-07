/**
 * globset - public surface.
 *
 * Everything the backup tool, the restore planner and the retention job are
 * allowed to import. Modules under src/ that are not re-exported here are
 * internal and may be reorganised freely; the names below may not.
 */
export { compile } from './compile.js'
export { match } from './match.js'
export { select } from './select.js'
export { expandBraces } from './braces.js'
export { isDirectory } from './paths.js'
export { DEFAULT_OPTIONS } from './options.js'
