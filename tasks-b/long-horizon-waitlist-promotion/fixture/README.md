# ticketing

Box office for a single event: seat sales, a waitlist, and the promotion of
cancelled seats down that waitlist.

```
docs/waitlist-rules.md   the rules the venue signed off - treat as the contract
src/                     the implementation
test/                    reproductions; a subset of what the box office checks
```

## Use

```js
import { createService } from './src/index.js'

const svc = createService({ capacity: 100, offerTtl: 30 * 60 * 1000 })

svc.purchase('fan-1', 1000)          // { status: 'sold', ticketId: 'T-1' }
svc.join('fan-2', 'priority', 1001)  // { status: 'joined', position: 1 }
svc.cancel('T-1', 2000)              // seat offered down the waitlist
svc.positionOf('fan-2')              // 1-based position, or null
```

Every command carries the current time as its last argument. Nothing in the
library reads a clock; "now" is whatever the caller says it is, and time moves
when a command carries it.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the box
  office and the importer both import these files directly.
- No dependencies. The service runs inside the box-office container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Ticket and offer ids are deterministic (`T-1`, `O-1`, ...), so a replay of
  the same command stream produces the same stream of ids.
- `docs/waitlist-rules.md` is the agreed contract. When it and the code
  disagree, the document is right and the code is a bug.
