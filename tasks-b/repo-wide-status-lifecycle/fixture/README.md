# flowdesk

One shared status lifecycle for the four internal boards.

```
docs/status-lifecycle.md  the contract every board follows - read it first
src/index.js              the public surface: everything a consumer may import
src/lifecycle.js          the shared lifecycle, in code
src/orders.js             the fulfilment board
src/tickets.js            the support board
src/subscriptions.js      the billing board
src/shipments.js          the dispatch board
src/summary.js            the weekly rollup over exported statuses
bin/desk.js               standup demo driver (not part of the surface)
config/desk.config.json   board registry for the ops tooling
test/                     reproductions; a subset of what the boards are checked against
```

## Use

```js
import { createOrders, createTickets, summarise } from './src/index.js'

const orders = createOrders()
orders.add({ id: 'o-1', status: 'new' })  // legacy spellings accepted on read
orders.get('o-1').status                  // 'open' - canonical on write
orders.transition('o-1', 'triaged')
orders.list({ status: 'assessed' })

summarise(['open', 'dispatched'])         // { counts: {...}, active, total }
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it.
- No dependencies. The boards run in a container with no network and no
  package registry.
- `src/index.js` is the stable public surface. Modules not re-exported there
  are internal and may be reorganised; the surface may not.
- `docs/status-lifecycle.md` is the contract. When a board and the document
  disagree, the document is right.
- Deterministic: nothing under `src/` reads the clock, randomness, or the
  filesystem.
- Run the reproductions with `npm test` (which is `node --test`).
