# lh-search-ranking

**stratum:** long-horizon
**prompt:** "Search has been misbehaving since the last index release and we cannot ship it like this. Identical queries come back in a different order, phrase searches match documents that never contain the phrase, anything accented is unfindable, paging repeats or skips hits while the count next to the pager disagrees with the hits themselves, and a document we deleted is still ranking. Make the index behave the way docs/ranking-rules.md and docs/query-syntax.md say it should; the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

The fixture is an in-memory document index (`docsearch`) behind a search API:
folded terms with positions, an inverted index keyed by term -> document -> field
-> positions, a documented BM25-shaped score, negation, paging, and a write path
that keeps the derived state true. The contract is
`fixture/docs/ranking-rules.md` (analysis, matching, score, order, paging,
maintenance) plus `fixture/docs/query-syntax.md` (the clause language and the
`parseQuery` shape); every hidden expectation is derivable from those two files,
the config, and the code.

## Sub-problems (each its own hidden test file)

| file | cases | sub-problem | the bug in the fixture |
|---|---|---|---|
| `01-analysis` | 5 | folding, tokenising, where the stopword list applies | `analyzer.js`: indexed text is only lower-cased (`foldCase`) while the query is fully folded (`fold`), so an accented word is unfindable from either spelling; and the query analyser matches `/[a-z]+/` on the folded string, so a query made of digits analyses to nothing |
| `02-phrases` | 3 | a phrase is adjacency inside one field, in order | `phrase.js`: a phrase matches when its terms are merely all present, with no positions and no field check |
| `03-ranking` | 5 | the documented score and the documented order | `ranking.js`: `idf` is fed the collection size instead of the document frequency, so it is the same constant for every term; the boost is applied to the summed frequency of the strongest field after the length normalisation instead of per field before it; ties are broken by title (a non-unique field) instead of by id |
| `04-boolean` | 4 | negation excludes; all-negative queries still match | `engine.js`: an all-negative query gets an empty candidate set instead of every document; a negated clause is checked as a substring of the raw field text instead of as a term/phrase match |
| `05-paging` | 4 | limit/offset walk the ranked list; total is the match count | `paging.js`: `offset` is multiplied by `limit` (pages, not hits) and `total` is the length of the page that was just cut |
| `06-maintenance` | 4 | the derived state follows the documents | `documents.js`: the mean length is cached and never invalidated; `postings.js`: `documentFrequency` counts (document, field) pairs, and removal leaves a term entry behind when its last document goes; `reindex.js`: writing an id that is already indexed adds the new terms without taking the old ones out |

Eight source files carry a bug (`analyzer.js`, `phrase.js`, `ranking.js`,
`engine.js`, `paging.js`, `documents.js`, `postings.js`, `reindex.js`) across
seven modules; `query.js`, `fold.js`, `stopwords.js`, `config.js`, `util/text.js`
and the CLI are clean and only exist to be read. The negation bug sits in the
engine, a module the prompt does not hint at.

## Interaction cases (8 of 25)

The suite is built so that a solution which reads one rule and implements it
still fails where two rules meet:

| case | needs |
|---|---|
| `01` folding + phrase adjacency (`"café noir"`) | `analyzer.js` **and** `phrase.js`: the phrase tokens must fold onto the indexed terms *and* be adjacent in one field |
| `02` phrase + field boundary + boost | `phrase.js` **and** per-field positions; the boosted title match has to outrank the body match |
| `02` stopword list + phrase adjacency (`"in the"`) | the stopword rule (query-time only) **and** adjacency: presence-only matching cannot separate the two documents |
| `03` removal + the average-length denominator + `idf` | `ranking.js` **and** `documents.js` (live mean) - the exact score after a removal moves only when both are right |
| `04` all-negative query + id order | `engine.js` **and** `ranking.js`: the complement has to be produced, then ordered by id rather than by title |
| `04` negation + paging | `engine.js` **and** `paging.js`: `total` counts the filtered set, and the page is cut from it |
| `04` negation + folding (`-café` only excludes `Café`) | `engine.js` **and** `analyzer.js`: a token-based exclusion finds nothing while `Café` is indexed as `café`, and the raw-text check still misses it after the exclusion is fixed |
| `05` empty page + offset | `paging.js`: an offset past the end is an empty page that still reports the full total |

Two deliberate traps that only bite a half-fix: a phrase that is adjacent
across a field boundary (a fix that collects all positions for a document
instead of per field still matches it), and the two-field score (a fix that
keeps the saturated total frequency and moves the boost still fails the exact
value).

## Guards (pass on the untouched fixture on purpose)

- `01` "the stopword list filters queries and never indexed text" - the list is
  applied at query time only, so document lengths, positions and frequencies
  count stopwords.
- `03` "a shorter document outranks a longer one for the same term" - the length
  normalisation is right in the fixture; the bug is what it is applied to.

Both stop a rewrite from breaking correct behaviour. That is all: the floor is
2/25 = 8%.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 4/13 pass, exit 1 | **2/25 = 8%** |
| reference | 13/13 pass, exit 0 | **25/25 = 100%** |

Reference changes 8 files: `src/{analyzer,phrase,ranking,engine,paging,documents,postings,reindex}.js`.

## Gradient (measured, one module at a time)

| arm | hidden |
|---|---|
| untouched fixture | 8% |
| `analyzer.js` only | 20% |
| `phrase.js` only | 20% |
| `ranking.js` only | 16% |
| `engine.js` only | 12% |
| `paging.js` only | 24% |
| `documents.js` + `postings.js` + `reindex.js` only | 24% |
| everything the visible suite forces (analysis + phrase + ranking + paging) | 60% |
| everything except `ranking.js` | 80% |
| everything except `engine.js` | 84% |
| everything except `paging.js` | 80% |
| everything except maintenance | 76% |
| reference | 100% |

Fixing one module moves that module's file and nothing else (the single-module
arms above are exactly "its own file plus the two guards", except where an
interaction case is listed). Greening the visible suite alone lands at 60%:
the visible cases are deliberately the easy end and never touch negation,
maintenance or the exact score.

## Shape

- `fixture/`: 25 text files, ~1,410 lines; 14 modules under `src/`, a config
  file, a sample corpus, a CLI wrapper, two docs and four visible test files.
- Pure Node ESM, zero dependencies, no clock, no randomness, no locale APIs
  (`src/fold.js` folds with an explicit table; `Intl`/`toLocaleLowerCase` appear
  nowhere outside a comment explaining why they are absent). The 25 hidden cases
  never write, never read the cwd and never depend on file order.
- Hidden suite: 25 cases, 6 files, one top-level `test(` per case at column 0,
  no subtests, no `.only`/`.skip`, importing only `../src/index.js`.
