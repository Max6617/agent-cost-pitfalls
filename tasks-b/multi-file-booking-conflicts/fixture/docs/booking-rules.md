# Booking rules

The rules facilities signed off for the room-booking service. `src/` is the
implementation; when the two disagree, this document is right and the code is a
bug.

## 1. Time

All times are integer minutes past midnight. There is no clock, no timezone and
no dates anywhere in the service: a booking spans from one integer to another.

A booking occupies the **half-open interval `[start, end)`**: it holds the room
from `start` up to but not including `end`. Two bookings whose intervals merely
touch — one ends at the exact minute the other begins — do **not** collide.

A request with `start >= end`, or with a non-integer time, is refused with
reason `invalid-range`.

## 2. Rooms

Rooms are fixed when the service is created. Each room has a `type` and a
`capacity`. The type decides the turnaround time (section 4):

| type | turnaround (minutes) |
|---|---|
| `lecture-hall` | 20 |
| `studio` | 10 |
| `phone-booth` | 0 |

**Capacity is inclusive**: a meeting of exactly the room's capacity is allowed;
one attendee more is not.

## 3. Booking a room

`book({ id, room, start, end, attendees })` either confirms the request or
refuses it. The checks run in this order, and the first failure is the answer:

| order | check | result |
|---|---|---|
| 1 | the room exists | `{ status: 'rejected', reason: 'unknown-room' }` |
| 2 | the range is valid | `{ status: 'rejected', reason: 'invalid-range' }` |
| 3 | the attendees fit the capacity | `{ status: 'rejected', reason: 'capacity' }` |
| 4 | no confirmed booking overlaps | `{ status: 'rejected', reason: 'overlap', conflictsWith }` |
| 5 | the turnaround is respected | `{ status: 'rejected', reason: 'turnaround', conflictsWith }` |

A confirmed request returns `{ status: 'booked', id }`.

`conflictsWith` names the confirmed booking the request collides with. When
several confirmed bookings collide with the same request, the one with the
**earliest start** is named. A refused request changes nothing.

## 4. Turnaround

Between two bookings in the same room, facilities needs the room type's
turnaround time **on each side**: a booking may not start fewer than
`turnaround` minutes after the previous booking ends, and it may not end fewer
than `turnaround` minutes before the next booking begins. Exactly the
turnaround is enough: starting 20 minutes after a lecture-hall booking ends is
fine.

Turnaround is per room: what happens in one room says nothing about another.
A room with turnaround 0 only refuses genuine overlaps.

A request that both overlaps a booking and cuts into another booking's
turnaround is reported as an `overlap` (check 4 runs before check 5).

## 5. Cancelling

`cancel(id)` acts on confirmed bookings only. Cancelling a booking that is not
confirmed returns `{ status: 'not-found', id }` and changes nothing.

Cancelling a confirmed booking releases its slot immediately — a later `book`
for the same minutes succeeds — and then **offers the freed room to the
waitlist** (section 6). The result is `{ status: 'cancelled', id, promoted }`,
where `promoted` lists the ids of the waitlisted requests that were confirmed,
in the order they were confirmed (`[]` when none were).

## 6. The waitlist

`joinWaitlist({ id, room, start, end, attendees })` queues a request that
cannot be placed right now, and returns `{ status: 'waitlisted', id }`. The
queue refuses what `book` would refuse for reasons 1-2 (unknown room, invalid
range); anything else joins, **whether or not it can ever fit** — a request for
more heads than the room seats is queued like any other.

There is one queue, first in first out. `waitlist()` returns the whole queue,
oldest request first.

Queued requests are confirmed **only** by a cancellation in their room, and in
strict order: after a cancellation, the oldest queued request **for that room**
is offered first; if it can be placed it is confirmed under its own id and the
next-oldest is offered, and so on. The walk stops at the first request that
still cannot be placed — no request is ever confirmed ahead of an older request
for the same room, even when the older one cannot be placed and it could. A
cancellation in one room never touches another room's queue.

A request is placeable when it would pass checks 3-5 of section 3 against the
confirmed bookings as they stand: the attendees fit, nothing overlaps, and the
turnaround is respected. A promoted request is an ordinary confirmed booking
from then on: it shows in `bookings(room)` (which lists a room's confirmed
bookings in start order), it collides with later requests, and it can be
cancelled like any other.
