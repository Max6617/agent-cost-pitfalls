/**
 * ini-dialect - public surface.
 *
 * Everything the deployment tooling and the integrators are allowed to
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
export { parse } from './parser.js'
export { serialize } from './serialize.js'
export { getSection } from './model.js'
export { IniParseError } from './errors.js'
export { dump } from './inspect.js'
