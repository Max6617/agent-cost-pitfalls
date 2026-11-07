# box office

Seat allocation for a venue: courtesy holds, group allocation and
best-available scoring.

```
config/halls.json         the house maps we deploy with (reference data)
docs/seating-rules.md     the rules the venues signed off - treat as the contract
src/                      the implementation
test/                     reproductions; a subset of what the nightly job checks
```

## Use

```js
import { createVenue, createBoxOffice } from './src/index.js'

const venue = createVenue({
  rows: [
    { id: 'A', count: 9, aislesAfter: [3, 6] },
    { id: 'B', count: 9, aislesAfter: [3, 6], accessible: [1, 2, 8, 9] },
  ],
})
const office = createBoxOffice(venue)

office.requestGroup({ size: 2 }, 1000)              // the best block at t=1000
office.requestGroup({ size: 2, needsAccessible: true }, 1000)
office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
office.confirmHold('h-1', 1010)                     // before it lapses
```

Time is always an argument. Nothing here reads the wall clock: the kiosks
pass a session clock, the batch expiry job passes its sweep time, and the
tests pass plain numbers.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the kiosks and the batch
  job import these files directly.
- No dependencies. The service runs inside the tills, which have no network
  and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Seats cross the surface as labels (`'B12'`), never as row/number pairs, so
  one spelling of a seat exists everywhere.
