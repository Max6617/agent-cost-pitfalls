# qp

The quoted-printable codec the outbound gateway pipes message bodies through:
a simplified RFC 2045, written down in `docs/quoted-printable.md`. Where the
code and the docs disagree, the docs are right.

```
docs/quoted-printable.md   the agreed rules - treat as the contract
src/index.js               the public surface: encode, decode
src/                       the implementation (internal)
bin/qp.js                  stdin/stdout filter used by the gateway smoke script
test/                      reproductions; a subset of what the gateway checks
```

## Use

```js
import { encode, decode } from './src/index.js'

encode('café \nsecond')  // 'caf=C3=A9=20\nsecond'
decode('caf=c3=a9')      // 'café'
```

Text crosses the surface as JavaScript strings; the codec UTF-8-encodes on the
way in and decodes on the way out, so `decode(encode(x)) === x` for any `x`.

## Conventions

- ESM only (`"type": "module"`); the gateway imports these files directly.
- No dependencies; the build container has no network and no package registry.
- `src/index.js` is the stable public surface. Modules it does not re-export
  are internal and can be reorganised freely.
- `node --test` runs the reproductions under `test/`.
