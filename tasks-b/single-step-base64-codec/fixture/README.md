# base64codec

Base64 and base64url encoding and decoding, for strings and for byte arrays.
No dependencies, no I/O — text in, text out.

```
docs/codec-spec.md   the behaviour we agreed on — treat it as the contract
src/                 the implementation
test/                reproductions; a subset of what the codec is checked against
```

## Use

```js
import { encodeBytes, encodeString, decodeToBytes, decodeToString } from './src/index.js'

encodeString('hello')                          // 'aGVsbG8='
encodeBytes(new Uint8Array([0xfb, 0xff, 0xfe])) // '+//+'
encodeBytes([0xfb, 0xff, 0xfe], { alphabet: 'url', padding: 'none' }) // '-__-'

decodeToString('aGVsbG8=')                     // 'hello'
decodeToBytes('-__-', { alphabet: 'url' })     // Uint8Array [ 251, 255, 254 ]
decodeToString('aGVsbG8', { mode: 'lenient' }) // 'hello' — padding optional
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it.
- No dependencies. The codec ships into environments with no network and no
  package registry, so `node --test` must work on a bare checkout.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Strings cross the surface as UTF-8. Anything that is not text should go
  through the byte functions, which round-trip every byte value 0–255.
- Errors for malformed input are `CodecError`; the details (including the
  `offset` field) are specified in `docs/codec-spec.md`.
