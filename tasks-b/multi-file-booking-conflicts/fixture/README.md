# booking

Room booking for the office: rooms, requests, cancellations, a waitlist.

```
docs/booking-rules.md   the rules facilities signed off - treat as the contract
src/                    the implementation
test/                   reproductions; a subset of what the front desk checks
```

## Use

```js
import { createService } from './src/index.js'

const svc = createService({
  rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 20 }],
})

svc.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 12 })
// -> { status: 'booked', id: 'b-1' }

svc.joinWaitlist({ id: 'w-1', room: 'oak', start: 600, end: 660, attendees: 8 })
svc.cancel('b-1')      // frees the room and offers it to the waitlist
svc.bookings('oak')    // confirmed bookings, in start order
svc.waitlist()         // the queue, oldest request first
```

Times are integer minutes past midnight; there is no clock anywhere in the
service. Request and response shapes, and the rules behind them, are in
`docs/booking-rules.md`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  booking board and the calendar sync import these files directly.
- No dependencies. The service runs inside the front-desk container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the surface cannot.
- `npm test` runs the reproductions under `test/`.
