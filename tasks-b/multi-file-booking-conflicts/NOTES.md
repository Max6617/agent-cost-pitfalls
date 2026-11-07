# multi-file-booking-conflicts

stratum: multi-file

A room-booking service (rooms, intervals, bookings, waitlist) over integer
minutes with no clock: half-open `[start, end)` overlap semantics, per-room-type
turnaround buffers, cancellation with waitlist promotion, per-room capacity,
and conflict rejections that name the booking they hit.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-overlap` | half-open `[start, end)`: touching is not an overlap | `src/intervals.js` `overlaps` uses `<=` on both ends, so `end == start` is reported as a collision |
| `02-buffer` | turnaround owed on both sides of a booking; exactly enough is enough | `src/buffers.js` checks only the gap after an existing booking; a request ending just before one sails through |
| `03-cancellation` | cancelling releases the slot and offers it to the waitlist | `src/service.js` `cancel` removes the booking but never walks the queue; `promoted` is always `[]` |
| `04-fifo` | promotion is strict FIFO with head-of-line blocking, per room | `src/waitlist.js` `promote` scans the room's whole queue and confirms every placeable request, jumping a blocked head (never called in the broken fixture; latent until `03` is fixed) |
| `05-capacity` | capacity is inclusive: exactly full is allowed | `src/rooms.js` `holds` uses `attendees < capacity`, refusing an exactly-full room |
| `06-naming` | a refusal names the conflicting booking; earliest start wins | `src/bookings.js` `findConflict` returns the first overlapping booking in confirmation order, not the earliest-starting one |

Bugs live in six modules; the fifo bug is the one the prompt does not hint at
(it is unobservable until cancellation promotes at all).

## guards (the 4 cases that pass on the untouched fixture)

- `02-buffer` *a booking that starts exactly when the turnaround ends is
  accepted* — the boundary a `<= buffer` rewrite would break.
- `03-cancellation` *cancelling frees the slot, and an unknown id is a
  not-found* — release and error shape are already correct.
- `04-fifo` *a waiting request that still lacks turnaround is not skipped
  over* — passes on the untouched fixture only because nothing is ever
  promoted; a solution that wires promotion without fixing the buffer's
  before-side (or the head-blocking walk) breaks it.
- `04-fifo` *a request that can never fit still blocks the queue behind it* —
  same shape: correct answer is "no promotion", so it passes broken, and it
  fails on any solution whose promotion skips the head.

## interaction cases (10)

`01` ending exactly when the next booking starts still owes its turnaround
(overlap × buffer reasons); `02` a slot between two bookings owes turnaround to
the later one; `03` a promoted request collides like any other confirmed
booking, and the next request in line is not confirmed over the one just
promoted (cancellation × overlap); `04` head-blocking on turnaround
(cancellation × fifo × buffer, guard), a blocked request stops the walk even
when a later one would fit, a cancellation only promotes requests for the freed
room, a never-fitting request blocks the queue (fifo × capacity, guard), a
waiting request that exactly fills the room can be promoted (capacity × fifo ×
cancellation); `05` a full-but-legal meeting is refused for its clash, not its
size (capacity × overlap precedence); `06` an overlap is reported even when the
request also cuts into a turnaround (naming × check precedence).

## measured

`node tasks-b/_tools/verify-task.mjs multi-file-booking-conflicts`:

- broken (untouched fixture): visible 3/8 pass (exit 1, 5 failing cases),
  hidden **4/24 = 17%** (exactly the four guards; verified via the grader's
  TASKFAIL list)
- fixed (reference overlay): visible 8/8 pass (exit 0), hidden **24/24 = 100%**
- fixture: 15 text files, 512 lines; reference changes 6 files
  (`src/{intervals,buffers,rooms,bookings,waitlist,service}.js`)

## notes on calibration

The visible suite reproduces overlap, buffer, capacity and naming symptoms
(two of them pass broken: the working after-side gap and over-capacity); it
deliberately has no failing reproduction for cancellation/promotion beyond the
passing "cancel frees the slot" sanity case, so greening the visible suite
leaves the whole promotion cluster (`03`, `04`, and the promotion-dependent
cases elsewhere) untouched. A solution that fixes exactly the four
visible-reproduced sub-problems lands around 17/24 ≈ 70%; the head-blocking
walk (`04`, from docs §6) is the last thing a strong-but-hasty model misses.
