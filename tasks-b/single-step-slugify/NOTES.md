# single-step-slugify

stratum: single-step

A title-to-slug library: one small cohesive module set whose sub-problems are
the rule areas of the domain, pinned in `docs/slug-rules.md` (the contract).

## sub-problems

| hidden file | rule area | the bug in the fixture |
|---|---|---|
| `01-fold` | accent folding per a pinned mapping table | `src/fold.js` is missing the table rows for æ œ ß ø đ ł þ (and their capitals); docs pins the full table |
| `02-separators` | words are runs of a-z0-9, everything else collapses to single hyphens | `src/words.js` splits on whitespace only and *deletes* punctuation inside tokens (`one,two` → `onetwo`) |
| `03-stopwords` | stopwords dropped only strictly between words; first/last word always kept | `src/stopwords.js` drops stopwords at every position |
| `04-truncate` | max-length cut at the last hyphen at or before the limit, else hard cut | `src/truncate.js` does a plain `slice(0, max)` — mid-word cuts and dangling hyphens |
| `05-dedupe` | taken slugs gain -2/-3/…, first free number wins, exact match | `src/dedupe.js` always appends `-2`, colliding when `foo-2` is already taken |

The pipeline itself (`src/slugify.js`, order pinned in docs §1) is correct;
`bin/slugify.js` is a CLI wrapper and is noise.

## guards (pass on the untouched fixture, 4)

- `01-fold` *common accents fold to their base letters* — rows present in the
  broken table (`Crème brûlée`).
- `02-separators` *whitespace and punctuation runs collapse to single hyphens*
  — the classic mainline the broken tokenizer happens to get right.
- `04-truncate` *a slug that exactly fits is left alone* — no truncation path.
- `05-dedupe` *a taken slug gains a numeric suffix* — `-2` is correct when
  only the base slug is taken.

## interactions (8)

- `01` *folding happens before length fitting* — æ→ae expansion changes where
  the cut lands.
- `02` *folded characters join words, unfolded ones still separate* — fold +
  separator rules together (`smør.brød` → `smor-brod`).
- `03` *stopword handling decides what deduplication sees* — edge stopword
  kept, so no suffix.
- `03` *stopwords are dropped before length fitting* — pipeline order.
- `04` *a single long word is hard cut when no boundary fits* — ß→ss expansion
  creates the long word (fold + hard cut).
- `04` *a numeric suffix may exceed the length limit* — suffix exempt from
  maxLength; broken run also emits a dangling hyphen here.
- `05` *deduplication runs against the fitted slug* — truncation + suffix
  climbing past two taken variants.
- `05` *folding decides what deduplication sees* — ø→o makes the slug collide.

## measured (gate: `node tasks-b/_tools/verify-task.mjs single-step-slugify`)

- untouched fixture: visible 3/10 pass (exit 1) — **hidden 4/25 = 16%**
- reference: visible 10/10 pass (exit 0) — **hidden 25/25 = 100%**
- fixture: 13 text files, 383 lines; reference changes 5 files
  (`src/{fold,words,stopwords,truncate,dedupe}.js`)

Visible suite: 10 cases, 7 failing on the untouched fixture, at most two per
sub-problem, the easiest discriminating case of each.
