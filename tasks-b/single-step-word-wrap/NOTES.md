# single-step-word-wrap

stratum: single-step

## sub-problems

1. `01-width-boundary` — a line of exactly `width` columns is full, not over
   (`measure.js`: `fits` uses `<` where the docs say "at most").
2. `02-hanging-indent` — the indent counts toward the width, so a continuation
   line's budget is `width - indent` (`indent.js`: `limitFor` returns `width`
   for every line index).
3. `03-long-words` — an overlong word overflows whole on its own line, never
   split (`words.js`: `breakLong` hard-chunks words to the budget).
4. `04-space-collapsing` — gaps are measured collapsed/expanded, not in source
   characters (`wrap.js`: the fit check counts `gap.raw.length`, the raw
   source gap, instead of the rendered `gap.text.length`).
5. `05-tab-expansion` — the tab-stop table is implemented correctly in
   `tabs.js`; these cases discriminate through the measurement bug (a tab's
   source length is 1, its expansion up to 8).
6. `06-paragraphs-and-errors` — newline preservation, empty input and the
   documented `RangeError`; all correct in the fixture (guards).

## guards

The three cases in `06-paragraphs-and-errors.test.mjs` pass on the untouched
fixture: "hard line breaks and blank lines are preserved", "empty input wraps
to empty output", "a width below 1 is rejected as a RangeError".

## interactions

9 cases exercise two sub-problems at once: `02` cases 2 and 4 (indent x
exact-fit, indent x paragraphs), `03` case 3 (long word x indent), `04` cases
1, 4 and 5 (collapse x exact-fit, collapse x trim, collapse x indent), and all
three `05` cases (tabs x measurement).

## measured

- untouched fixture: 3/24 hidden cases (12%); visible suite 4/9 pass, exit 1
- reference: 24/24 hidden cases; visible suite passes
- reference changes 4 files: `src/{measure,indent,words,wrap}.js`
