# multi-file-seat-selection

stratum: multi-file

A venue seat-allocation service: seat maps with aisles, courtesy holds with a
TTL against an injected `now`, contiguous-group allocation, and best-available
scoring. Four modules cooperate (`venue`, `holds`, `allocator`, `scoring`)
behind a thin `boxoffice` service; each carries one plausible shipped bug.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| 01-contiguity | seats across an aisle are not adjacent; blocks/holds must not span an aisle | `venue.js` `isContiguous` checks only consecutive seat numbers, ignoring `aislesAfter` |
| 02-scoring | best available prefers the centre line; row distance is only a tie-breaker | `scoring.js` `blockKey` leads with row distance from the front, offset second |
| 03-holds | a hold is active strictly before its expiry moment; expiry frees seats immediately | `holds.js` `isActive` is `now <= expiresAt`, so a hold still blocks (and confirms) at its expiry moment |
| 04-accessible | accessible seats release to general booking only when no row offers a contiguous standard run of the requested size | `allocator.js` releases only when every row has zero free standard seats, so scattered singles keep accessible seats locked forever |
| 05-flow | interactions: holds x scoring, expiry x allocation, contiguity x release, re-hold x allocation, expiry x accessible | (no separate bug; needs two or more fixes at once) |

## guards (pass on the untouched fixture, exactly 4)

- 01 *a run inside one section of the row is contiguous*
- 03 *an active hold keeps its seats out of allocation* (aisle-free venue, so
  the contiguity bug adds no candidates)
- 04 *an accessible request is offered accessible seats*
- 04 *a general request is not offered accessible seats while a standard block fits*

## interaction cases (6)

05 has five (hold forcing a centred pick further back; two TTLs at the
boundary; a cross-aisle standard "run" must not count as availability;
re-hold at the boundary then allocate; accessible hold lapsing at the
boundary), and 04 *a released request takes the best accessible block* needs
the release fix and the contiguity fix together (the broken contiguity check
"finds" a standard block across an aisle and never reaches the release path).

## measured

- untouched fixture: **4/23 hidden cases (17%)** — the four guards and nothing else
- reference: **23/23 hidden cases (100%)**
- visible suite: broken 1/9 pass (exit 1), reference 9/9 pass (exit 0)
- fixture shape: 16 text files, 588 lines
- reference changes 4 source files: `src/venue.js`, `src/holds.js`,
  `src/scoring.js`, `src/allocator.js`

Gate: `node tasks-b/_tools/verify-task.mjs multi-file-seat-selection` prints `ok`.
