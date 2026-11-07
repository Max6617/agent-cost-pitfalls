# fraction-math

Exact rational arithmetic for the calculator and the unit converter. Values
stay as integer numerators and denominators end to end; nothing goes through
binary floating point.

```
docs/fraction-rules.md   the rules the library was built to - treat as the contract
src/                     the implementation
test/                    reproductions; a subset of what the library is checked against
bin/fraction.js          evaluate one expression from the command line
```

## Use

```js
import { fromString, add, div, compare, sort, toString, toMixedString } from './src/index.js'

toString(add(fromString('1 1/2'), fromString('3/4')))   // '9/4'
toString(div(fromString('2/3'), fromString('4/5')))     // '5/6'
toMixedString(fromString('7/2'))                        // '3 1/2'
sort([fromString('1/2'), fromString('-1 1/4')]).map(toString)  // ['-5/4', '1/2']
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  calculator imports these files directly.
- No dependencies. The library runs inside the calculator bundle, which has no
  package registry at build time.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- A fraction is a frozen plain object `{ n, d }`. Reading `.n` and `.d` is
  part of the surface; constructing the object by hand is not — use
  `makeFraction`.

## Running the tests

```
npm test
```

which is `node --test`. The command-line wrapper evaluates one expression:

```
node bin/fraction.js '1 1/2' + '3/4'
node bin/fraction.js --mixed '7/3'
```
