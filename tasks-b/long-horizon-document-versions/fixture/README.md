# docver

A versioned-document service: drafts, publish, revert.

```
docs/rules.md     the rules the team agreed - treat as the contract
src/              the implementation
test/             reproductions; a subset of what the acceptance checks cover
```

## Use

```js
import { createDocumentService } from './src/index.js'

const docs = createDocumentService()
docs.createDocument({ id: 'spec', title: 'The spec' })

const { draft } = docs.createDraft('spec', { author: 'ana' })
docs.saveDraft('spec', draft.id, { content: { title: 'v1', blocks: ['a'] }, base: draft.base })
docs.publishDraft('spec', draft.id)

docs.getVersion('spec', 1)        // { version: 1, base: null, content: {...} }
docs.publishedVersion('spec')     // 1
docs.listVersions('spec')         // every version and draft, in the pinned order
```

Every mutating call returns `{ status, ... }`; the status vocabulary is in
`docs/rules.md`. Nothing throws.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  embedding application imports these files directly.
- No dependencies. The service runs inside a container with no network and no
  package registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the surface cannot.
- Document content is plain JSON. The service never shares a reference with its
  caller: content is copied on the way in and on the way out.
- The service has no clock. Nothing is timestamped; ordering comes from version
  numbers and draft ids, never from time.
