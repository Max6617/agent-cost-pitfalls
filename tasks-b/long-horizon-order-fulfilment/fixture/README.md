# fulfilment

Event-sourced order fulfilment for the warehouse: orders are driven by an event
log (created, paid, pick, pack, ship, deliver, cancel, return) and every answer
the service gives is derived by replaying that log.

```
docs/fulfilment-rules.md   the rules the warehouse signed off - treat as the contract
src/                       the implementation
test/                      reproductions; a subset of what the warehouse checks
```

## Use

```js
import { createService } from './src/index.js'

const svc = createService({ stock: { WIDGET: 10 } })   // units on hand per sku

svc.apply({ id: 'e-1', at: '2024-03-01T09:00:00Z', order: 'o-1', type: 'created',
            items: [{ sku: 'WIDGET', qty: 2, price: 500 }] })
svc.applyAll([...])                    // one { id, status } result per event

svc.state('o-1')                       // { order, status, items, paid, refunded }
svc.report({ through: 6 })             // units and money after a log prefix
svc.report()                           // ... and after the whole log
```

`at` is always supplied on the event: the service never reads a clock. The
status vocabulary and every rule that matters are pinned in
`docs/fulfilment-rules.md`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  importer and the reconciliation job both import these files directly.
- No dependencies. The service runs inside the warehouse container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- All money is integer minor units (cents). Nothing here ever produces a
  fraction of a cent.
