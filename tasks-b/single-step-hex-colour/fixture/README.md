# tint

CSS colour parsing and canonical serialisation for the theme pipeline.

```
docs/colour-rules.md   the notation rules design signed off - the contract
src/                   the implementation
bin/colour.js          the command-line wrapper the pre-commit check runs
test/                  reproductions; a subset of what design QA checks
```

## Use

```js
import { parse, toHex } from './src/index.js'

toHex(parse('#f80'))                 // '#ff8800'
toHex(parse('rgba(0, 0, 0, 0.5)'))   // '#00000080'
toHex(parse('hsl(120, 100%, 25%)'))  // '#008000'
toHex(parse('RebeccaPurple'))        // '#663399'
```

`parse` returns a plain `{ r, g, b, a }` - integer channels 0..255, alpha
0..1 - or `null` when the text is not a colour. `toHex` writes the canonical
form back. The individual notations are also exported (`parseHex`, `parseRgb`,
`parseHsl`) for callers that already know what they are holding.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the pre-commit check
  imports these files directly.
- No dependencies. The pipeline container has no network and no registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Run the tests with `node --test`.
