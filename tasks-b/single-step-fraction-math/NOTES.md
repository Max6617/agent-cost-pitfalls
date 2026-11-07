# single-step-fraction-math

stratum: single-step

An exact rational-arithmetic library: normalisation, parsing (plain fractions,
bare integers, mixed numbers), the four operators, comparison/ordering, and
canonical string and mixed-string output. One small cohesive library; the
sub-problems are rule areas of the domain.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-normalise` | lowest terms, sign in numerator, denominator > 0, 0 = 0/1, canonical output | `src/reduce.js` — `gcd` runs Euclid's loop on signed values, so the gcd comes out negative whenever the remainder chain ends negative; dividing by it pushes the sign into the denominator (`-6/4` normalises to `3/-2`, but `-4/6` is accidentally fine) |
| `02-parse` | `'3/4'`, `'7'`, mixed `'1 1/2'`, free spacing | `src/parse.js` — a mixed number's leading sign is applied only to the whole part (`'-1 1/2'` parses as `-1 + 1/2`), and the fraction regex has no `\s*` around the slash (`'3 / 4'` is rejected) |
| `03-arithmetic` | + - * / exact; division by zero is a RangeError | `src/arithmetic.js` — `div` divides the `toNumber()` doubles and rebuilds a fraction from the decimal string, exact only when the quotient happens to be a terminating binary decimal (`2/3 ÷ 4/5` becomes `8333333333333333/10000000000000000`) |
| `04-compare` | total order; sort/min/max/equals agree | `src/compare.js` — the both-negative rule (flip the magnitude order) was copy-pasted onto the mixed-sign case, so `compare(-2/7, 1/2)` returns `+1` |
| `05-interactions` | parsed values flowing through arithmetic, ordering and output | needs several of the fixes above at once |

`src/format.js`, `src/fraction.js` and `src/index.js` are correct as shipped;
the comparison bug is the one the prompt does not hint at.

## guards (pass on the untouched fixture, 4)

- 01 `a positive fraction reduces to lowest terms`
- 03 `division by zero is a RangeError`
- 04 `two positives order by value`
- 04 `two negatives order by reversed magnitude`

## interactions (9)

- 01 `reduction holds when the remainder chain crosses signs` (subtraction × normalise)
- 01 `the mixed view carries the sign on the whole value` (format × normalise)
- 03 `addition and subtraction are exact, across zero` (negative result × normalise)
- 03 `multiplication is exact and reduces, across signs`
- 03 `division handles unreduced and negative operands exactly` (div × signs)
- 05 all four cases (parse × sort, parse × div × equals, parse × add × normalise, sub × mixed view)

## measured

- untouched fixture: **4/24** hidden cases (17%; the four guards), visible suite 5/9 pass, exit 1 (4 failing)
- reference: **24/24** hidden cases, visible suite 9/9, exit 0

Reference changes 4 files: `src/{reduce,parse,arithmetic,compare}.js`.

Where partial credit lives: an agent that greens the visible suite (fixes one
reduction sign case, the mixed-number sign, the division float and one
comparison case) still misses the airy-notation parsing, `abs`/`negate`
normalisation, negative mixed-string output, and every interaction case, which
is roughly 15/24. The `gcd` bug is deliberately input-dependent — `-4/6` is
correct while `-6/4` is not — so a fix that special-cases one witnessed input
instead of taking `Math.abs` in the loop leaves cases behind.
