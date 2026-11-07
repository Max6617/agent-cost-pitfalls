# docsearch

The in-memory document index behind the search API. One process holds the whole
corpus, serves ranked pages of results, and is kept up to date as documents are
added, edited and deleted.

```
config/index.config.json   field boosts, scoring constants, paging defaults, stopwords
data/sample-documents.json a small corpus for the CLI
docs/ranking-rules.md      how documents are analysed, scored, ordered and paged
docs/query-syntax.md       what a query may contain and what it means
src/                       the implementation
test/                      reproductions; a subset of what the API checks
bin/search.js              CLI wrapper - `npm run search -- "phrase" -word`
```

## Use

```js
import { createIndex } from './src/index.js'

const index = createIndex({ documents: corpus })

index.add({ id: 'doc-9', title: 'Release notes', tags: 'release', body: '...' })
index.update('doc-9', { body: '...' })
index.remove('doc-9')

const page = index.search('"release notes" -draft', { limit: 5, offset: 0 })
// { query, total, limit, offset, hits: [{ id, score }, ...] }

index.stats()               // { documents, terms, averageLength }
index.documentFrequency('release')   // how many live documents contain the term
index.get('doc-9')          // the stored document, or undefined
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; the API server imports these
  files directly.
- No dependencies: the search container has no network and no package registry.
- Nothing here reads the clock or a random source. The same corpus and the same
  query must produce the same page, byte for byte, in every process.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and may be reorganised; the surface may not.
- The runtime is built without ICU data, so no `Intl` and no locale-aware case
  conversion anywhere in `src/`. Folding is done by the table in `src/fold.js`.
- Documents cross the surface as plain objects with a string `id` and a string
  for each configured field. Missing fields read as `''`.
- Scores are floats and their exact magnitude is an implementation detail of the
  scoring rules; the *order* they produce is not.

## Running it

```sh
npm test                       # the reproduction suite
npm run search -- lighthouse   # query the sample corpus
```
