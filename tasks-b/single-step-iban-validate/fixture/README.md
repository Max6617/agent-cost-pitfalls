# iban

IBAN validation, generation and formatting for the eight countries our
customers actually use. The rules the library implements — the lengths, the
mod-97 checksum, the generation algorithm, the printable form — are written
down in `docs/iban-rules.md`; treat that document as the contract.

```
docs/iban-rules.md   the agreed rules, with worked examples and test vectors
src/index.js         the public surface (stable)
src/countries.js     the country/length table
src/checksum.js      numeric form, mod-97, checksum verification
src/build.js         IBAN generation from a BBAN
src/format.js        electronic <-> printable conversion
src/validate.js      full validation with structured reasons
src/cli.js           command-line front end
test/                reproductions; a subset of what acceptance checks
```

## Use

```js
import { isValid, validate, buildIban, toPrintable } from './src/index.js'

isValid('DE44 5001 0517 5407 3249 31')  // true - input may be printable or lowercase
validate('DE44 5001 0517')              // { ok: false, reason: 'bad-length' }
buildIban('NL', 'ABNA0417164300')       // 'NL91ABNA0417164300'
toPrintable('BE68539007547034')         // 'BE68 5390 0754 7034'
```

Run the reproductions with `npm test` (plain `node --test`, no dependencies).

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  importer and the CLI import these files directly.
- No dependencies. The library runs inside the payments container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- The library is pure: no clock, no randomness, no I/O. The CLI is the only
  place that touches `process`.
