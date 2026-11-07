/**
 * messages - public surface.
 *
 * Everything an app is allowed to import. Modules under src/ that are not
 * re-exported here are internal and may be reorganised; the names below may
 * not.
 */
export { normalizeTag, languageOf, fallbackChain } from './locales.js'
export { pluralCategory, selectPluralText } from './plurals.js'
export { interpolate } from './interpolate.js'
export { mergeBundles } from './bundles.js'
export { MessageService, createMessageService } from './service.js'
export { MissingKeyError, MissingValueError } from './errors.js'
export { builtinBundles } from './data/index.js'
