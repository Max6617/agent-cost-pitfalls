# inventory-allocation

Stock allocation for the order service: one engine per warehouse cluster, an
append-only stock ledger per `(warehouse, sku)`, reservations with a
time-to-live, per-channel safety stock, backorders and an available-to-promise
report.

```
config/warehouse.config.json   the site's settings (pack size, hold TTL, channels)
data/skus.json                 the sku catalogue and each sku's default buffers
docs/allocation-rules.md       the rules the business signed off - treat as the contract
src/                           the implementation
test/                          reproductions; a subset of what the pick line checks
bin/allocate.js                run one picking pass from the shell
```

## Use

```js
import { createAllocator } from './src/index.js'

const allocator = createAllocator()                    // singles, 2h holds
const casepack = createAllocator({ packSize: 6 })      // a site that shelves in cases

allocator.receive({ warehouse: 'north', sku: 'SKU-BOLT-6', qty: 40, at: '2024-05-01T06:00:00.000Z' })
allocator.setBuffer({ channel: 'web', sku: 'SKU-BOLT-6', warehouse: 'north', qty: 12 })

allocator.addDemand({
  orderId: 'o-1001', sku: 'SKU-BOLT-6', warehouse: 'north', qty: 30,
  priority: 1, channel: 'web', placedAt: '2024-05-01T07:00:00.000Z',
})
allocator.allocate({ at: '2024-05-01T08:00:00.000Z' })
// -> { filled: 28, backordered: 2, lines: [ { filled: 28, outstanding: 2, status: 'partial' } ] }

allocator.atp({ sku: 'SKU-BOLT-6', warehouse: 'north', channel: 'web', at: '2024-05-01T08:00:00.000Z' })
// -> { onHand, held, buffer, available }
```

Run it:

```sh
npm test                          # the reproduction suite
node bin/allocate.js 2024-05-01T06:00:00.000Z
```

## Conventions

- **ESM only.** `package.json` says `"type": "module"`; the order service and the
  console both import these files directly, so it stays that way.
- **No dependencies.** The pick line runs on a terminal in the warehouse with no
  network and no package registry.
- **`src/index.js` is the public surface.** Everything else under `src/` is
  internal and can be reorganised; the exported names cannot.
- **No clock, no randomness.** Every call that depends on *when* is given the
  instant it should reason about, and every id comes from a counter. The engine
  can be replayed exactly from its inputs, which is the only reason the pick
  line's numbers can be reconciled after the fact.
- **Quantities are whole units**, in `number`s. Amounts never round: a fill is
  either a whole pack or the exact quantity the rules allow.
- **Statuses, not exceptions, for the ordinary answers** — a release of an id
  nobody knows, a line the shelf cannot cover, a repeated request. A caller
  retrying a call must never have to catch anything to find out what happened.

## Where the rules live

`docs/allocation-rules.md` is the contract. The engine is expected to match it;
when the two disagree, the document wins and the code is the bug.
