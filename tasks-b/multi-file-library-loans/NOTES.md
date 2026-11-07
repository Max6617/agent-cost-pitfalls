# multi-file-library-loans

stratum: multi-file

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-renewals` | extension from the current due date; the two-refusal order; a hold blocks any copy's loan | `renewals.js` tests each hold's `copyId` against the loan's — holds carry `titleId`, never `copyId`, so the check never fires |
| `02-hold-queue` | class priority (staff > student > standard), FIFO inside a class, which hold a return readies | `holds.js` sorts `placedAt` descending inside a class, so the most recent arrival is served first |
| `03-overdue-fines` | day counting, per-category rates, the per-loan cap | `fines.js` adds 1 to the days late, counting the due date itself as the first late day |
| `04-grace-and-lost-fees` | grace waives (never shortens) the fine; grace never touches a lost fee; a lost fee replaces the fine | `loans.js` routes `reportLost` through the fine module's grace check, so a loss reported near the due date bills 0 |

Bugs live in four modules (`renewals.js`, `holds.js`, `fines.js`, `loans.js`).
The grace/lost bug is the one the prompt does not hint at. The renewal-block
bug reads as a leftover from the holds migration noted in `holds.js` ("a hold
is placed on a title, not a copy").

## guards (pass on the untouched fixture)

- *a third renewal is refused at the renewal limit* (01)
- *a renewal extends the due date from the current due date, not from today* (01)
- *staff queue ahead of standard members regardless of placement order* (02) —
  cross-class order is right on the broken fixture; only intra-class order is inverted
- *a return inside the grace period owes nothing* (04)

## interactions (8)

- 01: *held loan at the limit is refused as held* (refusal precedence);
  *cancelled hold / hold placed again* (cancel × renewal block)
- 02: *later staff hold jumps the queue but not past earlier staff* (priority ×
  FIFO); *a return readies the longest-waiting hold…* (queue × return flow ×
  pickup); *a cancellation keeps the rest of the queue in order* (cancel × FIFO × promotion)
- 03: *a renewed loan accrues from the renewed due date* (renewal × fine)
- 04: *a loss reported inside the grace period still bills the full replacement
  cost* (grace × lost); *a loss reported after a renewal…* (renewal × lost)

## measured

- untouched fixture: visible 3/9 pass (exit 1, 6 failing), hidden **4/19 = 21%**
- reference: visible 9/9 pass, hidden **19/19 = 100%**
- reference changes 4 files: `src/{fines,holds,loans,renewals}.js`

Gate: `node tasks-b/_tools/verify-task.mjs multi-file-library-loans` → `ok`
(fixture 14 text files, 670 lines; 19 authored cases across 4 files).

Where partial credit lives: greening the visible suite requires touching all
four bug areas, but the hidden suite's extra cases (refusal precedence,
cancel-then-re-hold, three-class queue mixes, grace-waives-not-shortens, lost
before the due date, lost after a renewal) are what separate a narrow patch
from a correct one.
