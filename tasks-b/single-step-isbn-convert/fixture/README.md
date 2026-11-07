# isbn

Validation, conversion and hyphenation for ISBN-10 and ISBN-13, used by the
catalogue importer and the title pages.

```
docs/isbn-rules.md     the agreed rules for both forms - treat as the contract
docs/hyphenation.md    the simplified registrant table the site hyphenates with
docs/background.md     the "why" behind the rules; the contract is the two above
src/                   the implementation
bin/isbn.js            manual check helper: node bin/isbn.js 978-0-306-40615-7
test/                  reproductions; a subset of what cataloguing checks
```

## Use

```js
import {
  normalizeIsbn,
  isbn10CheckDigit, isValidIsbn10,
  isbn13CheckDigit, isValidIsbn13,
  toIsbn13, toIsbn10,
  hyphenateIsbn13,
} from './src/index.js'

isValidIsbn10('0-306-40615-2')   // true
isValidIsbn13('9780306406157')   // true
toIsbn13('0306406152')           // '9780306406157'
toIsbn10('9780306406157')        // '0306406152'
hyphenateIsbn13('9780306406152') // '978-0-306-40615-2'
```

Every function accepts the separators documented in `docs/isbn-rules.md` §1 and
returns `null` (or `false`) for input that is not ISBN-shaped.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the importer and the site
  both import these files directly, so do not change it.
- No dependencies. The catalogue container has no network and no registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Run the tests with `npm test` (plain `node --test`).
