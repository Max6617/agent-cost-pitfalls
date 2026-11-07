# long-horizon-document-versions

stratum: long-horizon

A versioned-document service: drafts, publish, revert. The stateful sub-problems
are ordering (the pinned version list), idempotency-style first-wins publish,
conflict detection on a stale base, and an immutable published history.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-publish-freeze` | publishing freezes content; copies in, copies out | `store.js` stores and hands out live references, so a caller's retained (or leaked) object can rewrite a published version |
| `02-publish-conflicts` | concurrent publish is first-wins; the loser conflicts and re-bases | `publish.js` never checks the base: the last publish silently overwrites the version |
| `03-stale-base` | saving against a stale base conflicts with `stale-base`; saving against the current base re-bases and re-numbers | `drafts.js` compares the caller's base against `draft.base` (the value recorded at creation) instead of the document's current published version, so stale saves pass and valid re-base saves are refused |
| `04-revert` | revert opens a NEW draft on the old content; published history is immutable | `revert.js` overwrites the current published version's content in place |
| `05-lifecycle` | the pinned list order, delete rules, and a full playback across every rule | no bug of its own; every case is an interaction that the bugs above corrupt |

Reference changes 4 files: `src/{store,drafts,publish,revert}.js`.

## guards (the 4 cases that pass on the untouched fixture)

- `01` *the happy path: publishing lands the saved content under the next number*
- `02` *a published draft is consumed: publishing it again reports unknown-draft*
- `04` *reverting to a version that was never published is refused*
- `05` *published versions cannot be deleted*

## interaction cases (7)

- `02` *the losing draft can re-base and publish as the next version* — needs both the publish check and the save re-base
- `03` *a re-based draft saves and publishes cleanly* — save re-base feeding a publish
- `04` *the reverted draft publishes as a new version on top of history* — revert feeding a publish
- `04` *a revert can be followed by a revert to an even earlier version* — revert chains plus numbering
- `05` *the list is pinned…* — first-wins outcome shaping the pinned order
- `05` *end to end: draft, publish, race, rebase, revert…* — every rule in one sequence, including id non-reuse
- `05` *a draft opened after a revert still numbers off the published version, and loses the race* — revert plus first-wins

(`01`'s two leaked-read cases also count as behaviour the visible suite never touches.)

## measured

- untouched fixture: **4/23 hidden cases (17%)**; visible suite 4/11 pass, exit 1 (7 failing)
- reference: **23/23 hidden cases (100%)**; visible suite 11/11 pass, exit 0
- fixture shape: 14 text files, 640 lines
- gate: `node tasks-b/_tools/verify-task.mjs long-horizon-document-versions` prints `ok`

A solution that greens only the visible suite still misses the two leaked-read
copies in `01`, the re-base renumbering, the revert-publish chains and the
pinned-order interactions — the 40-60% band the batch aims for.
