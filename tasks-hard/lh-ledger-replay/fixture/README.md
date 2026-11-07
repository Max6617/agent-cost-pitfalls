# ledger

Event-sourced general ledger for the month-end close.

```
config/ledger.config.json   base currency, rounding, paths to the data files
data/accounts.json          the chart of accounts (a tree)
data/rates.json             published FX rates, USD per unit of currency
docs/ledger-rules.md        the rules finance signed off - treat as the contract
src/                        the implementation
test/                       reproductions; a subset of what close checks
```

## Use

```js
import { createLedger, decimal } from './src/index.js'

const ledger = createLedger()                 // config + data from this checkout
const ledger2 = createLedger({ rates: [...] }) // overrides, for tests and what-if

ledger.postAll(importedEntries)
ledger.balance('4100', { asOf: '2024-01-31' })  // '120.00', base currency
ledger.periodTotals('2024-01')                  // '120.00'
ledger.statement({ asOf: '2024-01-31' })        // { lines: [...], total: '...' }
```

`post()` and `postAll()` return `{ id, status }` per entry — see the status table
in `docs/ledger-rules.md`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the importer
  and the close job both import these files directly.
- No dependencies. The ledger runs inside the close container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the surface cannot.
- Amounts cross the public surface as decimal **strings**, never as `number`, so
  that a value cannot pick up binary floating point error on the way through.
