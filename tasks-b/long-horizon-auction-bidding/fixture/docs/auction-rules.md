# Auction rules

The rules the desk signed off. `src/` is the implementation; when the two
disagree, this document is right and the code is a bug.

## 1. Conventions

Money is integer cents. Time is integer ticks, always supplied by the caller:
a bid carries its own `at`, and `close(id, now)` takes the tick to close at.
Nothing in the service reads a clock.

A bid is **live** while `at <= endsAt` (a bid landing exactly on the deadline
still counts) and the lot is not already closed. Anything later is refused
`closed`.

## 2. Listing

`list({ id, startPrice, reserve, endsAt })` opens a lot. The reserve is
optional and defaults to the start price; a reserve below the start price is
refused `invalid`, as is a duplicate id (`duplicate-listing`).

## 3. Bidding and the minimum increment

The first bid on a lot must be at least the start price. Every later bid must
rise at least the **minimum increment** over the standing high bid, where the
increment is read from this table by the **standing bid**, before the new bid
is considered:

| standing high bid (cents) | minimum rise |
|---|---|
| under 2,500 | 100 |
| 2,500 up to 9,999 | 250 |
| 10,000 up to 49,999 | 500 |
| 50,000 and up | 1,000 |

The bracket bounds are inclusive below and exclusive above: a standing bid of
exactly 2,500 sits in the 250 row, exactly 10,000 in the 500 row, exactly
50,000 in the 1,000 row. A bid rising by exactly the increment is acceptable;
one cent short is refused `too-low`.

`placeBid` statuses:

| status | meaning |
|---|---|
| `accepted` | the bid is in (see §4 for what it settles to) |
| `too-low` | below the start price, or short of the standing bid plus the increment |
| `closed` | `at` is beyond the current deadline, or the lot is already closed |
| `invalid` | malformed bid (bad bidder, non-integer amount, `max` below `amount`) |
| `no-such-auction` | the lot id is unknown |

## 4. Proxy bidding and settlement

Every bid carries a **ceiling**: `max`, defaulting to the bid's own `amount`.
The ceiling is the most that bidder will pay; the service bids for them up to
it. A bid whose `max` is below its `amount` is `invalid`.

When a challenge meets the increment, the two ceilings contest the lot:

- The **higher ceiling wins** the lot.
- The winner pays the smaller of their own ceiling and the **loser's ceiling
  plus the increment** — the increment read at the loser's ceiling. Never more:
  a bidder is charged only what is needed to beat the underbidder, and when
  that is their whole ceiling, so be it.
- A challenge the standing ceiling beats is still an accepted bid: it raises
  the standing bid to that same settled price, and the challenger is out.
- **A dead heat stands with the earlier bid.** A challenger whose ceiling
  equals the standing ceiling loses, however large their bid amount was; the
  standing bid rises to the full shared ceiling.

The standing high bidder may raise their own ceiling with a further bid: the
ceiling moves up, the price does not, and it is not a contest.

## 5. The outbox

Every displacement appends exactly one `{ type: 'outbid', bidder, at }` notice
to the lot's outbox, in the order the displacements happen. A challenger
beaten by a standing ceiling is displaced like any other loser and gets their
one notice at the `at` of their bid. Refused bids displace nobody; a standing
bidder raising their own ceiling displaces nobody.

## 6. Soft close

A last-second bid should not steal a lot there is no time to answer. **Every
accepted bid that lands inside the final window extends the close** — whether
or not it changes who is winning. A challenge the standing proxy beats is
still a bid, and it extends the close like any other.

The window and the extension are configuration (`config/auction.config.json`);
this deployment runs a **window of 10 ticks** and an **extension of 30 ticks**.
"Inside the final window" is inclusive: a bid landing with exactly `window`
ticks to go counts. The new deadline is the bid's own `at` plus the extension
— never the old deadline plus anything — and the deadline never moves
backward. Extensions chain: a bid inside the extended window extends again
from its own `at`.

## 7. Closing

`close(id, now)` with `now < endsAt` answers `{ status: 'open' }` and changes
nothing. From `endsAt` onward it settles the lot, once — closing again returns
the same result:

| situation | result |
|---|---|
| no accepted bids | `{ status: 'no-bids', winner: null, price: null }` |
| high bid at or above the reserve | `{ status: 'sold', winner, price }` — the price is the settled high bid, not the winner's ceiling |
| high bid below the reserve | `{ status: 'reserve-not-met', winner: null, price: null }` |

Meeting the reserve exactly is a sale. Once a lot is closed, further bids are
refused `closed`.
