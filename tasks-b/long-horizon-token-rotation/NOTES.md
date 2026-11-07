# long-horizon-token-rotation

stratum: long-horizon

prompt: "Security reran the token-theft drill and it went badly: a refresh
token that had already been rotated out still works, and when we replayed a
stolen token only the replayed token died - the rest of the session family
survived, and access tokens issued before we killed the session kept working.
Users are also saying they get signed out about a week after login no matter
how active they are, and the admin session listing shows sessions that ended
long ago. The behaviour we agreed with security is written down in docs/; the
reproductions under test/ are what we managed to capture, not the whole
acceptance criteria."

Domain: a refresh-token service - families, rotation on every use, reuse
detection that revokes the family, absolute + idle expiry (now is injected,
tokens are derived from a deterministic in-repo hash, no randomness), logout,
access-token validation, and an admin session listing.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-rotation` | rotating invalidates the presented token; the handed-back deadline slides with use | `families.js` `rotate()` bumps the generation but never marks the presented token's record `rotated`, so every old token stays usable |
| `02-reuse` | a replayed token revokes the whole family; reuse is checked before expiry | `service.js` revokes only the presented token record (family survives), and checks expiry before reuse so an ancient replay reports `expired` instead of `reuse` |
| `03-expiry` | idle window anchored to last use; absolute cap; deadline instant is dead; tie reason is `absolute` | `expiry.js` `idleDeadline()` measures from `createdAt` (login) instead of `lastUsedAt` |
| `04-access` | family revocation cascades to already-issued access tokens; `revoked` outranks `expired` | `access.js` `revokeFamily()` is an empty body with a comment claiming expiry is enough; nothing ever marks issued tokens revoked |
| `05-same-instant` | same token twice in one instant: first rotates, second is reuse; lineage by generation, not timestamps | reachable only once rotation invalidates - on the untouched fixture the second presentation just rotates again |
| `06-sessions` | listing shows live sessions only (not revoked, not expired at `now`), sorted last-used desc then family id | `sessions.js` never filters expired families and sorts by `lastUsedAt` only, no family-id tie-break |

Bugs sit in five modules (`families`, `service`, `expiry`, `access`,
`sessions`); no single edit fixes two sub-problems except that 05's cases are
unreachable until rotation (01) is fixed, which is deliberate.

## guards (the 4 cases that pass on the untouched fixture)

- `01` *a token the service never issued is unknown*
- `02` *logout revokes the family, and is idempotent*
- `03` *an untouched family is alive one millisecond before its idle deadline and dead at it*
  (with no prior use, `createdAt == lastUsedAt`, so the broken idle clock agrees)
- `04` *rotation does not disturb access tokens already minted from the family*
  (guards against an over-aggressive fix that revokes access tokens on rotation)

## interactions (9 of 24)

- `01` deadline-in-rotation-response slides with use (rotation x expiry)
- `02` reuse detected after the family expired, still revokes (reuse x expiry check order)
- `03` both clocks firing at one instant report `absolute`; active family capped at the absolute deadline (idle x absolute)
- `04` replay kills already-issued access tokens (reuse x access cascade)
- `04` revoked access token reports `revoked` past its natural expiry (revocation x expiry precedence)
- `05` all three cases: same-instant first-wins (rotation x reuse), the winner's access token dies with the family (same-instant x access), born-and-rotated in one instant is still reuse (lineage vs timestamp)
- `06` listing tracks last use and the sliding deadline (sessions x expiry); replayed family disappears from the listing (reuse x sessions)

## measured

`node tasks-b/_tools/verify-task.mjs long-horizon-token-rotation`:

- untouched fixture: visible 2/9 pass (exit 1), hidden **4/24 = 17%** (exactly the 4 guards)
- reference: visible 9/9 pass (exit 0), hidden **24/24 = 100%**
- fixture: 16 text files, 637 lines; reference changes 5 files
  (`src/{families,expiry,access,service,sessions}.js`)

## where partial credit comes from

The visible suite exercises every sub-problem once or twice but only asserts
the headline symptom (status codes). A fix that greens it usually has the
five bug areas right but can still miss the pinned details the visible suite
never touches: the reuse-before-expiry check order (`02`), the
`refreshExpiresAt` value sliding with use (`01`, `03`), `revoked` outranking
`expired` on access tokens (`04`), and the family-id tie-break in the listing
(`06`) - worth roughly 4-6 hidden cases, so visible-green lands around
18-20/24.
