# edge-number-format

**stratum:** edge-case-dense
**prompt:** "Numbers in our reports have gone wrong in ways customers noticed. Amounts between a thousand and ten thousand print without their thousands separators while longer ones still have them, long fractions come back with commas inside them, and values that should round up are being cut off instead - a total of 999.995 lands as 999.99 rather than the next whole unit. The significant-digit renderings have grown stray digits, scientific results lost the sign in their exponent so they read e21 where they used to read e+21, and the reader now accepts pasted cells it used to refuse: '1,2,3' comes back as a number instead of an error, and a negative zero survives a read. Make the toolkit behave the way the house rules say it should; the reproductions under test/ are the cases reporting managed to write down, not the whole acceptance criteria."

`docs/number-format.md` is the contract and is internally consistent about
everything the suite asks; where its prose and its worked examples disagreed
(the fate of a value far below the grid, and the mantissa of a
`significant`-only rendering) the worked examples win and the case was left out.

## Sub-problems (each its own hidden test file)

| file | cases | sub-problem | the defect in the fixture |
|---|---|---|---|
| `01-grouping` | 5 | where separators go, and where they are not allowed | `grouping.js` gates on `whole.length > GROUP_MIN_DIGITS`, so a four-digit integer part is never grouped, and it runs the fraction through `groupDigits` as well, so four or more fraction digits come back as `1,234,567.0,000` |
| `02-rounding` | 5 | rounding on the printed decimal | `text.js` scales the digits onto the grid and then keeps them: the digit the grid drops never decides anything, so `1.005` is `1.00`, `2.675` is `2.67` and a carry never happens (`999.995` is `999.99`) |
| `03-significant` | 5 | the places a significant-digit count is worth | `precision.js` spends the whole count after the decimal point (`placesForRun` returns `significant - 1`), so `1234.567` at two digits keeps a fraction it has no digits left for and `0.5` at three digits keeps two zeros instead of three |
| `04-notation` | 5 | which shape a value is printed in | `notation.js` writes a positive exponent without the `+` (`1.00e21`), and `format.js` judges the notation on the value that arrived, so a count that carries `9.99e20` up to `1e21` is printed plainly instead of renormalised |
| `05-parse` | 5 | reading a number back out of text | `parse.js` strips every `,` before it tests the shape, so `1,2,3`, `12,34` and `1,23,456` are accepted as numbers, and it returns `Number('-0.00')`, which is `-0` |

Seven defects over six modules: `grouping.js` (two), `text.js`, `precision.js`,
`notation.js`, `format.js`, `parse.js`. Every one of them is derivable from
`docs/number-format.md` sections 1-6, and none of them is marked as a bug in the
code: the comments describe the intent the code no longer delivers.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 4/12 pass, exit 1 | **3/25 = 12%** |
| reference | 12/12 pass, exit 0 | **25/25 = 100%**, exit 0 |

Per file, untouched fixture: `01` 1 of 5 cases, `02` 0 of 5, `03` 0 of 5,
`04` 1 of 5, `05` 1 of 5. No case fails for a reason belonging to another file's
sub-problem alone, so fixing one module moves that file and nothing else.

`reference/` changes six files: `src/{grouping,text,precision,notation,format,parse}.js`.
`src/index.js`, `src/rules.js`, `src/util/*`, `src/report/*`, `src/data.js`, the
CLI and the config are already right, which is what keeps this a fix rather than
a rewrite.

## Interaction cases (a case that needs two sub-problems at once)

- `01-grouping` "a value that rounds up across a group boundary" (`999.995`):
  the rounding fix and the four-digit grouping threshold, since the carry lands
  `1,000.00` in a group that the untouched fixture refuses to group at all.
- `01-grouping` "a negative value is grouped from its first digit" (`-999.995`):
  the same two plus the sign, which must survive the carry.
- `01-grouping` "the separators belong to the integer part and never to the
  fraction" (`1234567` at four digits): the threshold and the fraction-grouping
  defect are both in `grouping.js`, and the case needs both gone.
- `02-rounding` "the digit count below the default pads and rounds": padding
  (`1.5` at four digits) fails on the fraction defect while rounding
  (`12345.678`, `2.5` at zero digits) fails on the truncation defect.
- `02-rounding` "a carry runs through a chain of nines into the integer part"
  (`9999999.995`): the rounding fix, then the grouping of the integer part the
  carry grew.
- `03-significant` "significant digits are grouped like any other rendering"
  (`precise(1234567.891, 9)`): the places fix stops the count reaching eight
  fraction digits, and the fraction fix stops those digits being grouped.
- `04-notation` "rounding a plain value over the bound renormalises it"
  (`9.99e20` at two significant digits): the places fix, the renormalisation
  decision and the exponent sign all have to be right for `1.0e+21`.
- `05-parse` "every group holds three digits, wherever it stands"
  (`1,23,456`): the separators must be judged where they stand rather than
  removed first, which is the same edit that keeps `-0.00` from being `-0`.
- `04-notation` "a value inside the plain range is never given an exponent"
  (`1234567.899`): the truncation defect alone would print `1,234,567.89`, and
  the notation decision has to leave the value plain as well.

## Guards (pass on the untouched fixture on purpose) — 3 of 25

- `01-grouping` "a three-digit integer part is never given a separator": the
  one place the fixture's threshold is accidentally right, and the case a
  destructive rewrite of the boundary would break.
- `04-notation` "zero is never scientific and the labels ignore the options":
  `0`, `NaN`, `Infinity` and `-Infinity` are already correct and are easy to
  lose while moving the notation decision around.
- `05-parse` "the empty input, whitespace, a lone separator and junk are
  refused": the reader's rejections that the fixture still gets right.

Every other case fails on the untouched fixture, which is where the 12% floor
comes from.

## Deviations from the brief, and why

- **Two cases from the original suite were dropped rather than fixed.** The doc
  says both "a tiny value that renders as zeros is still scientific
  (`format(0.0001)` is `1.00e-4`)" and "`format(-0.0001, { digits: 3 })` is
  `0.000`", and it says both that a mantissa carries `digits` and that
  `9.99e+20` at one digit is `1.0e+21`. A rendering cannot satisfy both halves of
  either pair, so the suite tests the halves the doc states twice and leaves the
  contradictory inputs alone. `format(-0.004)` is `0.00` (the doc's own worked
  example) and `format(0.0001)` is `1.00e-4`.
- **`Number.MIN_VALUE` is rendered from `toExponential`, not from a decimal
  literal.** `exactDigits` expands the exponential form because the digits of a
  subnormal cannot be read back out of a decimal string: `Number('0.' + '0'.repeat(323) + '5')`
  is `5e-324` only because the literal itself is rounded, and going through it
  loses the last digits that section 5 asks to keep.
- **`group()` takes the default digit count.** The README's example line was
  `group(-1234567) // '-1,234,567'`, which contradicts section 2 (`group` is
  `format` at the default digit count, trailing zeros included); the README line
  was corrected to `'-1,234,567.00'` so the visible reproduction and the contract
  agree.
