/**
 * router — public surface.
 *
 * Everything the framework, the route-lint CLI and the tests are allowed to
 * import. Modules under src/ that are not re-exported here are internal and may
 * be reorganised; the names below may not.
 */
export { Router, createRouter } from './router.js'
export { RouteTable } from './table.js'
export { parsePattern, PATTERN_KINDS } from './pattern.js'
export { matchPattern } from './match.js'
export { normalizePath, readTarget, splitPath, splitTarget } from './normalize.js'
export { decodeLoose, decodeValue, parseQuery } from './decode.js'
export { candidateMethods, normaliseMethod, KNOWN_METHODS } from './methods.js'
export { pickBest, compareSpecificity, specificityOf } from './precedence.js'
export { RouteError, MalformedEscapeError } from './errors.js'
export { IDENTIFIER, isIdentifier, isBlank, lastChar, splitClean } from './util/text.js'
