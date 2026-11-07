# auction-house

Ascending-auction service for the desk: list a lot, take bids with optional
proxy ceilings, close it out.

```
config/auction.config.json   increment table and soft-close policy for this deployment
docs/auction-rules.md        the rules the desk signed off - treat as the contract
src/                         the implementation
bin/simulate.js              replay a JSON script of events against a house
test/                        reproductions; a subset of what settlement checks
```

## Use

```js
import { createAuctionHouse } from './src/index.js'

const house = createAuctionHouse()                    // config from this checkout
const other = createAuctionHouse({ softClose: {...} }) // overrides, for what-if runs

house.list({ id: 'lot-1', startPrice: 50000, reserve: 61000, endsAt: 1000 })
house.placeBid('lot-1', { bidder: 'amy', amount: 55000, max: 60000, at: 100 })
house.placeBid('lot-1', { bidder: 'bo', amount: 57000, at: 995 })
house.state('lot-1')        // { phase, endsAt, highBid: { bidder, amount }, ... }
house.outbox('lot-1')       // [{ type: 'outbid', bidder, at }, ...] in order
house.close('lot-1', 1025)  // { status: 'sold' | 'reserve-not-met' | 'no-bids' | 'open', ... }
```

`placeBid` answers `{ status, highBid, endsAt }`; the statuses are in
`docs/auction-rules.md`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  settlement job imports these files directly.
- No dependencies. The service runs inside the settlement container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- All money is **integer cents**, all time is **integer ticks** supplied by the
  caller. Nothing here reads a clock; a bid carries its own `at`, and `close`
  takes the tick to close at.
- A bid is live while `at <= endsAt`. The deadline moves — see the soft-close
  rule in the docs — so `state()` is the only reliable read of it.
