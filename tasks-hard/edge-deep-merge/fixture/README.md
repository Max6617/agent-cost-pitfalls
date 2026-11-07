# layered-config

Small toolkit for layered configuration: defaults from the repository, overrides
from a file, a patch from a service, a render at the end.

```
docs/merge-rules.md      the contract - treat it as the spec
src/                     the implementation
test/                    the reproductions we wrote
config/app.defaults.json the defaults this repository ships
examples/                two override files, for the CLI and for eyeballing
bin/cfgmerge.js          CLI: dump a merged config and the patch that produced it
```

## Use

```js
import { merge, patch, diff, clone, deepEqual, hasOwn } from './src/index.js'

merge({ a: { b: 1 } }, { a: { c: 2 } })   // { a: { b: 1, c: 2 } }
patch(base, overrideFile)                 // same as merge, named for the workflow
diff(base, other)                         // the patch that turns base into other, or null
clone(value)                              // deep copy of the plain-data part
deepEqual(a, b)                           // the equality `diff` is built on
hasOwn(object, key)                       // own-key test that cannot be fooled
```

`merge` accepts any number of sources and applies them left to right.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the config service imports
  these files directly, so do not change it.
- No dependencies. The service container has no network and no registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and may be reorganised; the names exported from `index.js` may not change.
- Config values are JSON-shaped. A `Date`, `Map`, `Set`, `RegExp`, class instance
  or function value is carried through by reference and never inspected — see
  rule 6 in `docs/merge-rules.md`. The toolkit does not assume it can rebuild
  somebody else's class.
- Nothing here reads the clock, a random source, the environment or the
  filesystem. `bin/cfgmerge.js` is the only thing that touches files, and it is
  not part of the library.
