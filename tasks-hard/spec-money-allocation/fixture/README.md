# billing-money

The money toolkit the invoice service, the billing console and the month-end
report all share: exact decimals, rounding modes, allocation of a total across
weighted lines, per-currency formatting, discounts and invoice totals.

```
config/billing.config.json   defaults: currency, rounding mode, currency table
data/currencies.json         the declared currencies and their minor units
docs/billing-rules.md        the rules billing signed off - treat as the contract
src/                         the implementation
test/                        reproductions; a subset of what billing checks
bin/bill.js                  the CLI the console shells out to
```

## Use

```js
import { add, roundTo, allocate, formatAmount, createInvoice } from './src/index.js'

add('0.1', '0.2')                        // '0.3'
roundTo('2.675', 2)                      // '2.68'
roundTo('2.5', 0, 'half-even')           // '2'
allocate('0.11', ['1', '2', '3'])        // ['0.02', '0.04', '0.05'] - sums to 0.11
allocate('100', ['1', '1', '1'], { scale: 0 })  // ['34', '33', '33'] - JPY
formatAmount('1234.5', 'JPY')            // '1235'
createInvoice({ currency: 'EUR', lines: [{ description: 'Storage', amount: '10.00' }] })
```

## Public surface

`src/index.js` is the public surface. Everything else under `src/` is internal
and may be reorganised; these names may not.

| name | signature |
|---|---|
| `isDecimal` | `(value) -> boolean` |
| `normalize` | `(value) -> string` |
| `add`, `sub`, `mul`, `div` | `(a, b) -> string` |
| `sum` | `(list) -> string` |
| `negate`, `abs` | `(a) -> string` |
| `compare` | `(a, b) -> -1 \| 0 \| 1` |
| `isZero` | `(a) -> boolean` |
| `roundTo` | `(value, scale = 2, mode = 'half-up') -> string` |
| `ROUNDING_MODES` | the five mode names |
| `minorUnits` | `(code) -> number` |
| `formatAmount` | `(value, currency, options = {}) -> string` |
| `convert` | `(value, rate, currency, options = {}) -> string` |
| `allocate` | `(total, weights, options = {}) -> string[]` |
| `applyDiscount` | `(amount, discount, options = {}) -> string` |
| `percentageOf` | `(amount, percent) -> string` |
| `createInvoice` | `(spec) -> invoice` |
| `defaults` | `() -> config` |

`options` is always `{ mode, scale }` where it applies; both default to
`'half-up'` and `2`. Amounts are decimal **strings** everywhere on this surface;
nothing takes or returns a `number`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the invoice service imports
  these files directly and `bin/bill.js` is run with `node`.
- No dependencies. The billing container has no network and no package registry.
- No clock and no randomness anywhere in `src/`: an amount must depend only on
  its arguments, so a recomputed invoice always prints the same numbers.
- `test/` is run with `node --test` from this directory.
