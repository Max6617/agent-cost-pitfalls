# dsv — delimited text for the import pipeline

Reads the delimited files our suppliers send and writes them back out for the
loader. `docs/dialect-spec.md` is the contract; this file is the map.

```
docs/dialect-spec.md        the rules the pipeline and the suppliers agreed
config/import.config.json   the dialect the inbox is read with, and the paths
data/suppliers.csv          a sample file, for poking at the CLI by hand
src/                        the implementation
test/                       reproductions; a subset of what the loader checks
```

## Use

```js
import { parse, write, sniffDialect, resolveDialect, ParseError } from './src/index.js'

const { columns, rows, dialect } = parse(text)          // header: true by default
parse(text, { delimiter: ';', trim: true, ragged: 'pad' })
parse(text, { header: ['id', 'name'] })                 // names supplied, all lines are data
write(rows, { ...dialect, eol: '\n' })
sniffDialect(text)                                      // { delimiter, eol }
```

`parse()` returns `{ columns, rows, dialect }`:

- `columns` is an array of names, or `null` when `header: false`;
- `rows` are objects keyed by column name, or arrays of values when there is no
  header;
- `dialect` is the resolved dialect that was actually used.

`write()` takes either an array of records or a `parse()` result, and returns
the text.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the loader and the CLI both
  import these files directly, so that may not change.
- No dependencies. The loader container has no network and no package registry.
- `src/index.js` is the public surface. Anything under `src/` that is not
  re-exported there is internal and may be reorganised; the surface may not.
- Values cross the public surface as strings or `null`. The reader never guesses
  a type — parsing a field into a number or a date is the loader's job.
- Deterministic: nothing in here reads the clock, the filesystem or a random
  source. The CLI does the reading and writing of files, and nothing else does.
