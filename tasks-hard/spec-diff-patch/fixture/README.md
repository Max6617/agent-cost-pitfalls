# unidiff

Unified diff construction and application for the code-review service.

```
bin/unidiff.js            the JSON-line CLI the merge bot drives
docs/unified-diff.md      the contract - the format and the rules
docs/review-workflow.md   how the service uses the library (background only)
src/                      the implementation
test/                     reproductions; a subset of what the service checks
```

## Use

```js
import { buildDiff, applyPatch, parsePatch, diffstat } from './src/index.js'

const patch = buildDiff(baseText, headText, { fromLabel: 'main', toLabel: 'pr-42' })
const result = applyPatch(targetText, patch, { maxOffset: 100, ignoreWhitespace: false })

result.ok        // every hunk was placed
result.text      // the patched text, or the input unchanged
result.hunks     // [{ index, atLine, offset }] per placed hunk
result.errors    // one report when it was refused

diffstat(patch)  // { hunks, added, removed, error }
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; the merge bot imports these
  files directly and the service loads them without a build step.
- No dependencies. The service runs in a container with no network and no
  package registry.
- No clock, no randomness, no filesystem in `src/`. The caller owns the file; the
  library owns the text. A diff is a pure function of its inputs.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and may be reorganised; the names exported from `index.js` may not change, and
  neither may their behaviour, which `docs/unified-diff.md` fixes.
- `applyPatch` reports; it does not throw. `buildDiff` and `applyPatch` throw only
  for options they cannot honour (a negative `context` or `maxOffset`).
- Line texts are carried exactly as they arrive, carriage returns included.
  Nothing normalises line endings.
