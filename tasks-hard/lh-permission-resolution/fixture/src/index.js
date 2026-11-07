/**
 * authz - public surface.
 *
 * Everything the gateway, the deploy bot, the audit console and the tests are
 * allowed to import. Modules under `src/` that are not re-exported here are
 * internal and may be reorganised freely; the names below may not change shape.
 */
export { Engine, createEngine } from './engine.js'
export { matches } from './match.js'
export { buildGraph } from './graph.js'
export { loadConfig, loadPolicy } from './policy.js'
export { AuthzError } from './errors.js'
