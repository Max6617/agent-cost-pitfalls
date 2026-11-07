# single-step-roman-numerals

stratum: single-step

prompt: "Support keeps bouncing numerals our converter produced, and the archive
team found that re-importing a legacy inscription like DCCCC comes straight back
out unnormalised. Strict parsing is somehow accepting spellings like IL and
IIII, and a value that should have been rejected outright came back to them as
MMMM. The agreed rules are in docs/, and the tests under test/ are the
reproductions we managed to write - not the whole acceptance criteria."

## sub-problems

| file | sub-problem | the bug in the fixture |
|---|---|---|
| 01-subtractive | only IV/IX/XL/XC/CD/CM are legal subtractive pairs, in every mode | `validate.js` accepts I, X or C to the left of ANY larger symbol, so IL/IC/XD/XM parse fine; lenient mode skips validation entirely |
| 02-repetition | I/X/C/M repeat at most 3 times; V/L/D never repeat | `validate.js` throws only on a fifth consecutive repeat and never singles out V/L/D, so strict accepts IIII and both modes accept VV/LL/DD |
| 03-format | canonical formatting, hundreds column included | `format.js`'s greedy table is missing the 900/CM and 400/CD rows, so 400 -> CCCC, 900 -> DCCCC, 3999 -> MMMDCCCCXCIX |
| 04-modes-range | default mode is strict; unknown modes throw; the 1..3999 range binds parsed totals | `parse.js` defaults to lenient and treats any unknown mode as lenient; `range.js` checks `< 0` / `> 4000`, so format(0) is '', format(4000) is MMMM, parse('') is 0 and lowercase input returns NaN instead of throwing |
| 05-roundtrip | format(parse(x)) === canonical(x); canonicalize normalises legacy input and rejects what no mode accepts | emergent: the format-table, mode and validation bugs all surface through `canonicalize` and the round-trip laws |

Bugs live in 4 modules (`validate.js`, `parse.js`, `format.js`, `range.js`);
`symbols.js`, `canonicalize.js`, `index.js` and `bin/roman.js` are clean.
Reference changes exactly those 4 files.

## measured

Gate run: `node tasks-b/_tools/verify-task.mjs single-step-roman-numerals`
prints `ok`.

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 2/9 pass, exit 1 (7 failing) | **4/25 = 16%** |
| reference | 9/9 pass, exit 0 | **25/25 = 100%** |

- untouched fixture: 4/25 hidden cases (the 4 deliberate guards, nothing else)
- reference: 25/25 hidden cases, reported == authored == 25
- visible suite: fails before (7 of 9), passes after

## guards (the four cases that pass on the untouched fixture)

- `strict mode accepts each of the six legal pairs` (01) — the naive pair rule
  accepts the legal six too; guards against an over-strict rewrite
- `lenient mode accepts the legacy additive over-runs` (02) — documented
  lenient behaviour the broken parser already has; guards against "fix lenient
  by deleting it"
- `values without a hundreds pair are unaffected` (03) — the missing table rows
  only show at 400/900
- `the floor and the ceiling parse in the default mode` (04) — guards against
  over-tightening the range while repairing it

## interactions

14 of the 25 cases exercise two sub-problems at once or behaviour the visible
suite never touches:

- 01: lenient-mode pair rejection (mode x pairs), default-mode pair rejection
  (mode-default x pairs), legal pairs through a strict parse + re-format
  (pairs x format)
- 02: V/L/D rejected in EITHER mode (visible only probes VV/LL in lenient),
  fourth repeat rejected by the DEFAULT mode (mode-default x repetition)
- 03: out-of-range values rejected by format (format x range)
- 04: unknown modes throw (untouched by visible), non-uppercase input rejected
  (untouched by visible), range binds parsed totals incl. lenient MMMM
  (range x lenient over-runs)
- 05: canonicalize over legacy forms (lenient x format), canonicalize
  rejections (roundtrip x validation x range), strict-parse + format identity
  (pairs x format), boundary round-trips (range x format x parse), idempotence
  (roundtrip x format)

The headline interaction, per the assignment: a lenient-parse input whose
canonical re-format must still round-trip — `canonicalize('DCCCC')` must be
`'CM'`, and `canonicalize('IL')` must throw rather than produce `'XLIX'`.
