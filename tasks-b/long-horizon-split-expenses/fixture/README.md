# splitter

Group expense splitting: shared expenses, running balances, and settle-up
suggestions for a flat or a trip.

```
docs/split-rules.md   the rules the group agreed on - treat as the contract
src/                  the implementation
test/                 reproductions; a subset of what the acceptance checks
```

## Use

```js
import { createGroup } from './src/index.js'

const g = createGroup()
g.addMember('amy')
g.addMember('zoe')

g.addExpense({ paidBy: 'amy', cents: 1001, split: { mode: 'equal' } })
g.balances()            // { amy: 500, zoe: -500 } - amy took the remainder cent
g.suggestSettlements()  // [ { from: 'zoe', to: 'amy', cents: 500 } ]

g.recordSettlement({ from: 'zoe', to: 'amy', cents: 500 })
g.removeMember('zoe')   // { status: 'removed' } - she is even, so she can go
```

Split modes: `{ mode: 'equal' }`, `{ mode: 'percent', percents: {...} }`,
`{ mode: 'shares', shares: {...} }`, `{ mode: 'exact', amounts: {...} }`.
The full rulebook - including who gets the leftover cents and how the
settle-up list is built - is `docs/split-rules.md`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the app
  imports these files directly.
- No dependencies. The service runs where there is no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Money is integer cents everywhere: amounts cross the public surface as
  `number`s that are whole cents, never as floats of currency units.
- Nothing here reads the clock, rolls dice, or touches the filesystem.
