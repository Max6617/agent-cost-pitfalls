# single-step-hex-colour

**stratum:** single-step
**prompt:** "Design QA bounced the theme build again. Colours written with percentage channels come out a step off from the same colour written in integers, a negative hue rotation lands somewhere unrelated on the wheel, and translucent swatches lose a notch of alpha when they pass through the canonical hex form - the four-digit hex shorthand also disagrees with its eight-digit spelling. Please make the library behave the way docs/colour-rules.md says it should; the cases under test/ are the reproductions we managed to write down, not the whole acceptance criteria."

A CSS-colour parsing/serialisation library (`tint`): `parse(text)` reads
`#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa`, `rgb()`/`rgba()` with integer and
percentage channels, `hsl()`/`hsla()`, and a 12-name table; `toHex(colour)`
writes the canonical lowercase form. `docs/colour-rules.md` is the contract,
including the awkward rules (alpha digit duplicates like any other nibble;
percentages are of 255; negative hues wrap; rounding is half-up; the
eight-digit form is kept whenever alpha < 1, even when the byte rounds to ff;
green is `(0,128,0)`).

## Sub-problems (each its own hidden test file)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-hex-forms` | short hex expands by duplicating every nibble, alpha included | `hex.js` expands the r/g/b nibbles of `#rgba` but reads the alpha nibble through the byte path (`nibble / 255` instead of `expand / 255`) |
| `02-rgb-functional` | percentage channels are a percentage of 255; integers clamp, wrong shapes refuse | `rgb.js` scales percentages against 256 (`(pct / 100) * 256`) |
| `03-hsl-hsla` | hue is an angle taken modulo 360; s/l must be %; channels round half-up | `hsl.js` does `h % 360`, which in JS leaves negative hues negative and sends them down the wrong sector branch |
| `04-serialise` | canonical `#rrggbb`; eight digits iff alpha < 1; alpha byte rounds half-up | `serialise.js` floors `a * 255` before formatting (`0.5` writes `7f`, not `80`) |
| `05-parse-and-named` | dispatch, refusal, the named table, and where the notations meet | no bug of its own; holds the cross-notation interaction cases |

Four modules have to change (`hex.js`, `rgb.js`, `hsl.js`, `serialise.js`).
`channels.js`, `parse.js`, `named.js`, `index.js` are correct as shipped.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 6/10 pass, exit 1 | **4/21 = 19%** |
| reference | 10/10 pass, exit 0 | **21/21 = 100%** |

Gate output (`node tasks-b/_tools/verify-task.mjs single-step-hex-colour`):
`broken: visible 6/10 pass (exit 1), hidden 4/21 = 19%` /
`fixed : visible 10/10 pass (exit 0), hidden 21/21 = 100%` — prints `ok`.

Reference changes 4 files: `src/{hex,rgb,hsl,serialise}.js`.
Fixture shape: 17 text files, 531 lines (gate-measured).

## Guards (the four cases that pass on the untouched fixture)

- *#rgb expands each nibble by duplicating it* (01) — the three-digit form is
  correct as shipped; guards the expansion helper against a rewrite that
  "fixes" it.
- *integer channels are taken literally and clamp to the byte range* (02) —
  integer parsing, clamping, and the refusal of wrong channel counts and
  decimal "integers" are all correct as shipped.
- *the hue sectors produce the primaries and secondaries, and grey rounds half
  up* (03) — the positive-hue sectors and the `127.5 -> 128` knife edge guard
  the rounding rule against a rewrite that truncates.
- *names resolve case-insensitively against the documented table* (05) —
  guards `green = (0,128,0)` against being "corrected" to `(0,255,0)`.

## Interaction cases (8)

- *a declaration may mix integers and percentages* (02) — mixing rule x the
  percentage scale.
- *alpha takes a fraction or a percentage and clamps* (02) — percentage alpha
  x serialisation (`rgba(10, 20, 30, 25%)` -> `#0a141e40`).
- *saturation and lightness clamp, and must carry the % sign* (03) — clamping
  composed with a negative hue (`hsl(-60, 150%, 50%)` -> magenta).
- *hsla carries its alpha through the conversion* (03) — hsl alpha x the
  alpha-byte rounding.
- *a colour survives a serialise and parse round trip* (04) — rgba parse x
  serialise x hex reparse; the visible suite never round-trips.
- *parse trims its input and refuses what it cannot read* (05) — trimming x
  the `#rgba` nibble rule, plus the refusal table.
- *the same colour in two notations parses alike* (05) — hex x percentage
  channels (`rgb(100%, 53%, 0%)` is `#ff8700`), x serialised alpha.
- *a negative hue still lands on the right named neighbour* (05) and *alpha
  from any notation serialises to the same byte* (05) — hue wrap x named
  table; hsl alpha x hex alpha.

## Where partial credit comes from

The visible suite exercises each bug once, in its easiest form. A solution
that greens it has touched all four modules, but the hidden suite adds the
boundaries the visible suite never checks: percentages that discriminate at
several points of the range (35/53/55/62.5/75/80/95), hue wraps of more than
one turn and fractional negative hues, the alpha byte at 0.002/0.1/0.25/0.65
and the `ff`-when-rounded rule, and the cross-notation equivalences above.
