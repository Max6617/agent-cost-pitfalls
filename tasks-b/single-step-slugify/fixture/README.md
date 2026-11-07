# slugify

Turn a page title into the slug that goes in its URL.

```
src/index.js         the public surface - everything else under src/ is internal
docs/slug-rules.md   the rules the site agreed - treat as the contract
bin/slugify.js       command-line wrapper used by the import job
test/                reproductions; a subset of what the site checks
```

## Use

```js
import { slugify } from './src/index.js'

slugify('Hello, World!')                                  // 'hello-world'
slugify('alpha beta gamma', { maxLength: 11 })            // 'alpha-beta'
slugify('release notes', { existing: ['release-notes'] }) // 'release-notes-2'
```

`options.maxLength` caps the slug's length (default 60) and
`options.existing` is the list of slugs already in use. Both are optional.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  import job loads these files directly.
- No dependencies. The import container has no network and no package
  registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- The behaviour contract is `docs/slug-rules.md`. When code and document
  disagree, the document is right.

## Test

```
npm test
```
