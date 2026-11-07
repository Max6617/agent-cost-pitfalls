# Seating rules

The rules front of house and the venues signed off. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. The seat map

A venue is a list of rows, **front row first**. Every row's seats are numbered
from 1, and the numbering runs straight across the row. An aisle is recorded
separately, as "after seat N": it sits between seats N and N+1.

**Seats either side of an aisle are not adjacent**, even though their numbers
are consecutive. Two seats are adjacent only when their numbers differ by one
*and* no aisle lies between them. A set of seats is a **contiguous block**
when every neighbouring pair within it is adjacent. A single seat on its own
is a contiguous block.

Every seat is one of two kinds: `standard`, or `accessible` (wheelchair
spaces and their companions). A row may mix kinds.

## 2. Group allocation

A group is always seated **in one row**, in **one contiguous block**, and the
block is **one kind of seat** - a group is never split across rows, and a
block never mixes standard and accessible seats. There are no partial fills:
if no block of the requested size exists, the answer is `no-availability`,
never a smaller block.

Seats that are booked or under an active hold (see §4) are not available and
cannot take part in a block.

## 3. Best available

When several blocks qualify, the allocator offers the best one. A block's
quality is a key of four components, compared **in this order**, lower first:

1. **lateral offset** - how far the block sits from the venue's centre line,
   measured doubled so it stays an integer: `|lo + hi - centre2|`, where `lo`
   and `hi` are the block's lowest and highest seat numbers and `centre2` is
   `1 + (the number of seats in the widest row)`. If several rows tie for
   widest, the front-most of them sets the centre line.
2. **row distance from the front** - the front row is 0, the next row back 1,
   and so on. Closer to the front wins, but only once the offset ties.
3. **lowest seat number** in the block.
4. **row id**, alphabetically.

So a centred block three rows back beats an extreme block in the front row;
"best available" means best view, and the venues were explicit that the view
is set by the centre line first and by closeness to the stage second.

The same scoring applies to every block the allocator offers, standard or
accessible.

## 4. Holds

A courtesy hold reserves an explicit, contiguous block of seats in one row for
`ttl` minutes. Time is never read from the clock; every operation takes `now`
from its caller.

- A hold placed at `now` with `ttl` minutes expires at `now + ttl`.
- **A hold is active strictly before its expiry moment.** At the exact moment
  of expiry the hold has lapsed: it no longer blocks anything, it cannot be
  confirmed, and its seats are immediately bookable by anyone - including a
  brand-new hold over the same seats.
- The seats an active hold covers are blocked for everyone else. A confirmed
  hold becomes a booking: its seats are blocked for everyone, permanently.
- Confirming an active hold succeeds; confirming one that has lapsed (at or
  after its expiry moment) fails and frees nothing, because the seats were
  already free.

## 5. Accessible seating

A request that asks for accessible seating (`needsAccessible`) is only ever
offered accessible seats; if no accessible block fits, the answer is
`no-availability` - a standard block is never substituted.

A general request is offered standard seats. Accessible seats are released to
a general request **only when no row offers a contiguous run of free standard
seats of the requested size** - "free" meaning neither booked nor under an
active hold. When that happens the best accessible block (by the §3 scoring)
is offered. While any qualifying standard block exists, accessible seats are
never offered to a general request, no matter how much better they score.

## 6. Statuses

Every mutating or allocating call reports a status:

| situation | status |
|---|---|
| a group was allocated | `ok` (with the block's seat labels) |
| no qualifying block exists | `no-availability` |
| group size is not a positive integer | `invalid-request` |
| a hold was placed | `ok` (with `expiresAt`) |
| hold names a seat that does not exist | `unknown-seat` |
| hold seats are not one contiguous block in one row | `not-contiguous` |
| any hold seat is booked or under an active hold, or the hold id is in use | `conflict` |
| hold shape is wrong (no id, no seats, bad ttl, repeated seat) | `invalid-request` |
| an active hold was confirmed | `confirmed` |
| confirm/release names no live hold | `unknown-hold` |
| confirm arrives at or after the hold's expiry moment | `hold-expired` |
| a live hold was released | `released` |
