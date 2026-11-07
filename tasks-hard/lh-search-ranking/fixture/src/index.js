/**
 * docsearch - the public surface.
 *
 * Everything the API server and the CLI are allowed to reach for. The modules
 * under `src/` are internal and may be reorganised; this file may not.
 */
export { createIndex } from './engine.js'
export { tokenize } from './analyzer.js'
export { parseQuery } from './query.js'
export { fold, foldCase } from './fold.js'
export { DEFAULT_STOPWORDS } from './stopwords.js'
