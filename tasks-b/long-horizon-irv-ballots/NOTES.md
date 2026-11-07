# long-horizon-irv-ballots

stratum: long-horizon

A ranked-choice (instant-runoff) tally service: ballots arrive over time, the
count is read on demand. Fully deterministic; the written contract is
`docs/tally-rules.md`.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-majority` | a winner needs strictly more than half of the CONTINUING ballots; exhausted ballots leave the count and lower the bar | `src/majority.js` computes the bar over `accepted` (every ballot ever taken) instead of `continuing` |
| `02-tie-break` | last-place ties break by fewest transfer count, then by lowest candidate id | `src/eliminate.js` takes the first tied candidate in the counts Map - i.e. whoever received their first vote earliest, so arrival order can change the winner |
| `03-transfers` | an eliminated candidate never returns: not listed, receives no transfers, preferences skip over them | `src/tally.js` replaces the excluded set with `new Set([loser])` each round instead of accumulating, so a candidate eliminated two rounds ago is counted again |
| `04-invalid-ballots` | a ballot ranking the same candidate twice is invalid: skipped entirely, not stored, id reusable | `src/validate.js` never checks for a duplicate rank |
| `05-tally-idempotency` | tally() reports every ballot accepted before it is called, however often it was called before | `src/election.js` caches the tally and `addBallot` never invalidates it, so post-tally adds are invisible |

The prompt hints at 01-04; the stale tally cache (05, `src/election.js`) is
the bug behind a module the prompt does not mention.

## guards (the 4 cases that pass on the untouched fixture)

- `01` *an outright majority in the first round ends the count*
- `03` *a straightforward two-round count with a transfer*
- `04` *a ballot ranking a candidate outside the field is invalid too* (the
  unknown-candidate check is correct; only the duplicate-rank check is missing)
- `05` *a ballot id already in the count is refused as a duplicate*

## interaction cases (6; two sub-problems at once)

- `02` *each round settles its own ties, however deep the count runs* -
  tie-breaks in rounds 1 AND 2, deep enough that the revived-candidate bug
  also bites (needs 02 + 03)
- `02` *a ballot ranking only the eliminated candidate exhausts instead of
  transferring* - tie-break then an exhaustion that moves the bar (02 + 01)
- `03` *ballots that rank only the eliminated exhaust, and the count reflects
  it* - a round-2 transfer-count tie, a revival, and an exhaustion (01+02+03)
- `04` *skipping an invalid ballot changes the bar as well as the counts* -
  invalid ballot plus an exhaustion in round 2 (04 + 01)
- `05` *an invalid ballot changes nothing about the count* - validation
  against a cached tally (04 + 05)
- `05` *a tally after late ballots run deep into the count still follows the
  rules* - stale cache plus a three-round count where the revival bug bites
  (05 + 03)

## measured

- untouched fixture: visible 0/10 pass (exit 1), hidden **4/25 = 16%** (the 4
  guards, nothing else)
- reference: visible 10/10 pass (exit 0), hidden **25/25 = 100%**
- fixture shape: 14 text files, 570 lines
- reference changes 5 source files: `src/{majority,eliminate,tally,validate,election}.js`

A solution that fixes only the easy end of each sub-problem (the visible
suite) still misses the interaction cases above; the deep tie-break in `02`
and the revival interactions in `03`/`05` are where partial credit lives.

## notes for maintainers

- The tally loop caps rounds at the field size in BOTH fixture and reference;
  that cap is what keeps the broken fixture terminating (its scalar
  `excluded` would otherwise cycle revivals forever). With the correct
  accumulating set the cap is never reached before a natural end.
- All expectations were cross-checked by running the reference overlay
  locally; three first-draft expectations had hand-arithmetic slips in
  transfer counts (round-2 tie in `02`, round-3 counts in `03`), caught by
  the gate, not by reading.
