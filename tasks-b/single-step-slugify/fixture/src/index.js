/**
 * slugify - public surface.
 *
 * Everything the site, the import job and the report builders are allowed to
 * import. Modules under src/ that are not re-exported here are internal and
 * may be reorganised freely; the names below may not.
 */
export { slugify, DEFAULT_MAX_LENGTH } from './slugify.js'
export { foldAccents, FOLD_TABLE } from './fold.js'
export { toWords } from './words.js'
export { dropStopwords, STOPWORDS } from './stopwords.js'
export { fitToLength } from './truncate.js'
export { dedupe } from './dedupe.js'
