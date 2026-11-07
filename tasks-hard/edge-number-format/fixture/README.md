# metrik

Number presentation and parsing for the metrics and telemetry reports.

```
docs/number-format.md      the house rules the reports agreed on - the contract
config/report.config.json  report name, digit counts, grouping, notation switches
data/samples.json          a small frozen telemetry capture used by the demo CLI
src/                       the implementation
src/report/                the report, the config reader and the CSV export
bin/metrik.js              demo CLI: prints a report, the config and an export
test/                      reproductions; a subset of what reporting signs off
```

## Use

```js
import { format, group, precise, parseNumber, renderReport, csv } from './src/index.js'

format(1234.5)                              // '1,234.50'
format(1234.5, { digits: 1 })               // '1,234.5'
format(1e21)                                // '1.00e+21'
format(2.5, { significant: 3, digits: 2 })  // '2.50'
group(-1234567)                             // '-1,234,567.00'
precise(1.5, 3)                             // '1.50'
parseNumber('1,234.50')                     // 1234.5
csv([{ name: 'cpu', value: 12.345 }])       // header + 'cpu,12.35'

renderReport(samples)                       // { title, lines: [...], notes: [...] }
```

`format`, `group` and `precise` return strings. `parseNumber` returns a number
and throws a `RangeError` for anything the reports would not have printed;
`tryParseNumber` is the same reader with `undefined` instead of the throw.

## Conventions

- ESM only. `package.json` says `"type": "module"`.
- No dependencies, and none may be added: the reporting container has no
  network, no package registry and no ICU data. `Intl` and `toLocaleString` are
  out — every separator, every digit and every exponent is placed by hand.
- Deterministic: nothing here reads the clock, a locale or a random source, and
  nothing writes to disk. Given the same numbers, the same strings come out.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and may be reorganised; the surface may not.
- A number reaches the formatter as a `number` and leaves as a string that a
  customer reads. `test/` holds the reproductions we managed to write down, not
  the whole acceptance criteria — `docs/number-format.md` is the contract.
