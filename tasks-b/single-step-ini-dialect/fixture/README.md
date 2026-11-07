# ini-dialect

Reader and writer for the house INI dialect used by the deployment tooling and
a couple of external integrators. The dialect is **not** any other project's
INI: the exact rules are written down in `docs/dialect.md`, and where the code
and that document disagree the document is right.

```
docs/dialect.md     the dialect definition - treat as the contract
examples/app.ini    a realistic config in the dialect
src/                the implementation
test/               reproductions; a subset of what the acceptance checks cover
```

## Use

```js
import { parse, serialize, getSection, IniParseError } from './src/index.js'

const doc = parse(text)
doc.globals                  // { key: value } set before any section header
doc.sections                 // [{ name, entries }] in the order first seen
getSection(doc, 'server')    // a section's entries; the name match ignores case
serialize(doc)               // canonical text, ready to write back out
```

Every value is a string. The library never reads files, the clock, or the
network; the caller owns all of that.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the deployment tooling
  imports these files directly, do not change it.
- No dependencies. The parser runs inside a container with no network and no
  package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Run the tests with `npm test`.
