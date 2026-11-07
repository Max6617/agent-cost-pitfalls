# Waitlist rules

The rules the venue signed off for selling out a single event. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. The event

A service sells tickets for one event with a fixed `capacity`. A seat is in
exactly one of three states: **sold**, **reserved** by a pending offer, or
**free**. The event is oversold the moment sold plus reserved exceeds
capacity, and that must never happen.

## 2. The waitlist

Anyone may join the waitlist with `join(memberId, tier, now)`. `tier` is
`'priority'` (paid members) or `'standard'`; any other value is stored as
`'standard'`.

Joining reports `{ status: 'joined', position }`. Positions are **1-based**:
position 1 is the head of the line. Joining while already waiting is a
no-op reported as `{ status: 'duplicate', position }` against the entry that
is already there - nobody queues twice.

`leave(memberId, now)` removes a waiting entry and reports `{ status: 'left' }`;
leaving when not waiting reports `{ status: 'not-waiting' }`. Leaving does
**not** cancel an offer the member already holds; the offer stays valid and
the seat stays reserved. A member who leaves and joins again starts over with
a fresh entry at the tail.

## 3. The order of the line

The line is ordered **tier first, then arrival order within the tier**: every
priority member stands ahead of every standard member, and within a tier the
earlier joiner is ahead. This is the only ordering. Holding an offer never
moves an entry, and neither does letting that offer lapse.

## 4. Selling tickets

`purchase(memberId, now)` sells a ticket outright, but only while **nobody is
waiting**: if the waitlist is non-empty the sale is refused with
`{ status: 'full' }`, however many seats look free. While the waitlist is
empty a sale is made only if a seat is genuinely free - sold plus reserved
must stay below capacity, so a seat reserved by a pending offer is not for
sale even to a walk-up buyer. A successful sale is
`{ status: 'sold', ticketId }`.

## 5. Cancellation and offers

`cancel(ticketId, now)` retires a sold ticket and reports
`{ status: 'cancelled', offer }`; a ticket id that is not sold (never existed,
or already cancelled) is `{ status: 'unknown-ticket' }`.

When the waitlist is non-empty the freed seat is not sold: it is **offered to
the head of the line** - the first entry in the order of §3 that does not
already hold a pending offer. Nobody holds two offers at once; a member
holding one is passed over for any further seat until it resolves. The offer
carries a TTL: `offer.expiresAt = now + offerTtl`, and `cancel` reports it as
`{ offerId, memberId, expiresAt }`. If nobody can take the seat, `offer` is
`null` and the seat is free again.

## 6. Accepting

`accept(offerId, now)` turns a pending offer into a fresh ticket
(`{ status: 'accepted', ticketId }`; the cancelled ticket's id stays retired)
and takes the member off the waitlist if they are still on it.

An offer is pending until its expiry instant: at `now === expiresAt` it has
**already expired** and can no longer be accepted.

## 7. Expiry

Nothing reads a clock; time moves when a command carries it. Every command
first reclaims every pending offer whose expiry has passed, then runs.

Reclaiming an expired offer offers the seat to the next entry, exactly as if
the member had passed on it - with one difference: expiry is **not** a
decline. The member keeps their place in line with no penalty recorded; they
are skipped only for that seat, and the next freed seat is offered to them
again as normal.

An expired offer **always** frees its seat, whether or not anyone is waiting.
When nobody can take a reclaimed seat it goes back on general sale; a seat
must never stay reserved by an offer whose time has run out.

## 8. Declining

`decline(offerId, now)` turns down a pending offer. The seat moves to the
next entry as above, and the member is skipped for that seat.

The venue's courtesy: a member who declines **keeps their original position
in line, exactly once**. Their entry does not move - only their eligibility
for that one seat ends. A member who declines a **second** offer is taken off
the waitlist entirely; the courtesy is extended exactly once, never twice.

## 9. Resolved offers and unknown ids

An offer is `pending`, `accepted`, `declined` or `expired`. A command naming
an offer that is no longer pending reports the offer's current status and
changes nothing. A command naming an offer id that never existed reports
`{ status: 'unknown-offer' }`.
