# roman

Roman-numeral conversion for the inscription archive: parse, format and
canonicalise the values 1..3999.

```
docs/numeral-rules.md    the agreed rules - treat as the contract
docs/legacy-sources.md   where the lenient-mode inputs come from
src/                     the implementation
bin/roman.js             command-line front end
test/                    reproductions; a subset of what the archive checks
```

## Use

```js
import { parse, format, canonicalize } from './src/index.js'

parse('MMXXIV')                      // 2024
parse('DCCCC', { mode: 'lenient' })  // 900
format(400)                          // 'CD'
canonicalize('VIIII')                // 'IX'
```

Run the reproductions with `npm test` (plain `node --test`, no dependencies).

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  archive importer loads these files directly.
- No dependencies. The import container has no network and no registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Rejection means a thrown error; the library never answers bad input with a
  sentinel (null, NaN, -1, the empty string).
