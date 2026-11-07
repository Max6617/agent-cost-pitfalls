# word-wrap

Greedy word wrapping for the plain-text reports we send to fixed-width
terminals and printers.

```
docs/wrap-rules.md       the wrapping rules we signed off - treat as the contract
src/                     the implementation
test/                    reproductions; a subset of what the acceptance checks
bin/wrap.js              command-line wrapper
config/wrap.config.json  deployment defaults (the CLI flags override them)
```

## Use

```js
import { wrap, wrapLines } from './src/index.js'

wrap('the quick brown fox', 10)             // 'the quick\nbrown fox'
wrap('alpha beta gamma', 12, { indent: 3 }) // hanging indent on continuation lines
wrapLines('one\ntwo', 10)                   // ['one', 'two']
```

Run the reproductions with `npm test`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  report jobs import these files directly.
- No dependencies. The report container has no network and no package
  registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- When the code and `docs/wrap-rules.md` disagree, the document is right and
  the code is a bug.
