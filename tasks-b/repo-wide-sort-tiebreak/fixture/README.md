# opsboard

The back-office listing service: one codebase behind the team board, the
fulfilment queue, the account directory, the search box and the operations
console. Every screen shows rows of the same shape, and every screen is meant
to show them in the same order.

```
docs/listing-order.md   the listing order every screen agreed to - the contract
src/                    the implementation
test/                   reproductions; a subset of what the screens check
```

## Use

```js
import { listTasks, listOrders, listUsers, searchDocs, listAdmin } from './src/index.js'

listTasks(boardRows)        // the team board
listOrders(queueRows)       // the fulfilment queue
listUsers(accountRows)      // the account directory
searchDocs(indexRows, 'refund')  // the search box, filtered then ordered
listAdmin(consoleRows)      // the operations console
```

Every row carries at least `{ id, priority, createdAt }` plus whatever its
screen needs (`title`, `status`, `total`, ...). `createdAt` is an ISO-8601
string stamped at intake; it is data, and nothing in here reads a clock.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  screens import these files directly.
- No dependencies. The service deploys into a container with no network and
  no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- When a screen and `docs/listing-order.md` disagree about order, the doc is
  right and the screen is a bug.
