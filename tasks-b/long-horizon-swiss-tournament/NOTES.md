# long-horizon-swiss-tournament

stratum: long-horizon

A Swiss-system tournament service: register players, draw rounds, report
results (including forfeits), and publish the table. Deterministic, no
randomness; every tie-break is pinned in `docs/tournament-rules.md`.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-pairing` | score groups matched from the top, no rematches, floats | `pairing.js` — an odd group floats its lowest player first and then pairs the rest adjacently with no rematch check (the check only exists on the even-group path) |
| `02-bye` | the bye goes to the lowest-ranked player with the fewest byes | `bye.js` — `chooseBye` returns `eligible[0]`, the top of the field, instead of the last |
| `03-standings` | Buchholz excludes byes; the table never depends on entry order | `standings.js` — Buchholz adds the points a bye scored; the comparator breaks level tables by whose latest result was entered first (`lastSeq`) before rating |
| `04-registration` | late entries credited per the docs' half-point policy | `roster.js` — `LATE_ENTRY_POINTS = 1` (full point per missed round instead of a half) |
| `05-forfeit` | forfeits score but are unplayed: no Buchholz either side, still a pairing, two strikes withdraw | `history.js` — forfeits are recorded as ordinary played games, so they feed Buchholz |

Bugs sit in 5 modules (`pairing`, `bye`, `standings` ×2, `roster`, `history`);
`tournament.js` is honest glue and `util/compare.js` is noise.

## measured

- untouched fixture: **3/22** hidden cases (14%), visible suite **3/10 pass** (7 failing, exit 1)
- reference: **22/22** hidden cases (100%), visible suite **10/10 pass** (exit 0)
- reference changes 5 files: `src/{pairing,bye,standings,roster,history}.js`

Gate output (`node tasks-b/_tools/verify-task.mjs long-horizon-swiss-tournament`): `ok`.

## guards (the 3 cases that pass on the untouched fixture)

- *a rematch inside an even group pushes both players down before it is made*
  (01-pairing) — the fixture's even-group path does full rematch avoidance; a
  rewrite that drops it (e.g. "simplify" matching to plain adjacency) loses
  this case.
- *a three-round table with a bottom-board rematch and no ties anywhere*
  (03-standings) — multi-round Buchholz with no byes, forfeits or level rows;
  guards correct arithmetic against a destructive rewrite.
- *registration refuses duplicates and invalid entries, before and during play*
  (04-registration) — validation the fixture gets right.

## interaction cases

At least these cases exercise two sub-problems at once or behaviour the
visible suite never touches:

- *a level pair who meet again inside an odd group are kept apart over three
  rounds* (01) — cascade floats across three score groups built over three
  rounds.
- *a floater is matched inside the lower group, not replayed against their
  last opponent* (01) — the floater joins an odd group that itself contains a
  drawn pair.
- *three drawn pairs and a leader sort themselves out* (01) — a seven-player
  effective group with three met pairs.
- *a bye scores a point but adds nothing to Buchholz* (02) — bye assignment +
  Buchholz exclusion together; needs both fixes.
- *a bye and a forfeit still leave the table a pure function of the games*
  (03) — entry-order independence with a bye and a forfeit in the same round.
- *a late entry sits at half a point and is drawn into the next round* (04) —
  late credit + bye eligibility (the credit counts as a bye) + Buchholz.
- *a player who misses two rounds is credited one point, once* (04) — credit
  for two rounds + the next draw.
- *a late entry who wins still shows no Buchholz for the missed round* (04) —
  late credit + Buchholz exclusion + a full exact table.
- *a forfeit and a bye in the same round both stay out of Buchholz* (05).
- *two forfeits withdraw a player from the draw but not from the table* (05) —
  withdrawal + the next round's bye/draw.
- *a forfeited pairing still counts as having met when the draw comes round
  again* (05) — forfeit-as-pairing deciding the next draw + an exact table.

## notes for reviewers

- The odd-field pre-draw bye and the odd-group float paths are deliberately
  distinct: the fixture gets even-group matching and bottom-of-the-field
  *eligibility* right, so naive "swap a sort" fixes leave 01-pairing red.
- The docs pin a "leftover below the lowest group receives the bye" clause.
  With an even post-bye field the bottom pool provably always comes out even,
  so the clause is unreachable in practice — it is implemented identically in
  fixture and reference, and no test depends on it.
- Scores are whole/half points only, so all numeric assertions are exact.
