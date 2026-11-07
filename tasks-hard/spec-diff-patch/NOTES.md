# spec-diff-patch

**stratum:** spec-implementation
**prompt:** "Patches our reviewers approved last week are being refused by the merge bot even when the code they touch is sitting right there in the file, and support says the failure comment does not say which hunk went wrong or what it expected to find. When a patch does land it sometimes rewrites a line nobody touched, and it lands in the wrong place when the whitespace around it differs. A file whose last line has no newline comes back with one, a branch that only changed the line endings comes back as a diff of every line, and the same pair of revisions has produced two different patches on two runs of the same build. Make the library behave the way docs/unified-diff.md says it does; the reproductions under test/ are the ones we managed to write, not the whole acceptance criteria."

The fixture is a unified-diff tool (`buildDiff`, `applyPatch`, `parsePatch`, `splitLines`,
`formatRange`, …) for a code-review service. `fixture/docs/unified-diff.md` is the
normative contract: the line model, the hunk model and header forms, the alignment
and its tie-break, hunk grouping, the `\ No newline at end of file` marker,
placement with drift and its limits, tolerant whitespace matching, the failure
reports, and determinism. `fixture/docs/review-workflow.md` is background noise.
Every hidden expectation is derivable from that document plus the fixture's own
conventions.

## Sub-problems (one hidden file each, 25 cases)

| file | cases | sub-problem | the deviation in the fixture |
|---|---|---|---|
| `01-hunk-headers` | 4 | ranges and header forms, alignment and its tie-break, the `2 × context` grouping boundary | `format.js` writes `start,count` for a count of 1 (`@@ -1,1 +1,1 @@`) instead of the bare start; `lcs.js` advances the **old** side on a tie, so a replacement reads `-old`/`+new` instead of `+new`/`-old`; `hunks.js` merges only when the gap is `< 2 × context`, so a gap of exactly `2 × context` splits into two hunks |
| `02-no-newline` | 4 | the marker on the side it describes, reading it back, honouring it on apply | `format.js` emits the marker only after a `-` line (never after `+` or a context line); `parse.js` skips a `\` line without recording `noNewline`; `apply.js` therefore never strips the final newline |
| `03-offset-drift` | 6 | placement: origin, outward search order, `maxOffset`, the lower bound, drift at the end of the file | `apply.js` searches **forward only** from the claimed line, to the end of the file: no backward drift, no `maxOffset`, no lower bound |
| `04-whitespace` | 4 | tolerant matching: what compares equal, what still differs, and that it only decides *where* a hunk lands | `whitespace.js` compares `line.trim()`, which neither collapses internal runs nor keeps leading whitespace significant, and `apply.js` never consults `ignoreWhitespace` at all |
| `05-failure-report` | 4 | the `no-match` report and the `malformed` reasons table; all-or-nothing application | `report.js` reports `hunk` 0-based, points `line` at the first body line, puts the whole hunk (additions included) in `expected`, and reads `actual` one line too far; `apply.js` returns the **partially** patched text when a later hunk is refused |
| `06-edge-inputs` | 3 | empty patch and identical inputs, the `splitLines`/`joinLines` table, CRLF vs LF | `lines.js` strips a trailing `\r` from every line, so a CRLF file and its LF twin look identical |

Reference changes 8 files: `src/{lines,lcs,hunks,format,parse,apply,whitespace,report}.js`.
Each is a handful of lines; `build.js`, `config.js`, `index.js`, `stats.js`,
`annotate.js` and `bin/unidiff.js` are untouched.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 6/14 pass, exit 1 | **4/25 = 16%** |
| reference | 14/14 pass, exit 0 | **25/25 = 100%** |

`node tasks-hard/_tools/verify-task.mjs spec-diff-patch` → `ok`
(22 fixture files, 1,272 lines; 8 reference files changed).

## Interaction cases (7 of 25)

Cases that need two sub-problems right at once, or a behaviour the visible suite
never touches:

1. `01` **"a patch built for a pair with a repeated block…"** — build → parse → apply
   agreement on a pair with a duplicated block: the reparse pins the document's
   tie-break, and the same patch has to round-trip back to the target.
2. `02` **"a marked hunk is found again after the file has moved…"** — the
   no-newline marker inside a hunk that has drifted *up*: needs the backward
   search and the marker both.
3. `03` **"a hunk covering the last line of the file is found after the file has
   grown above it"** — drift combined with a hunk at the very end of the file,
   where the claimed window no longer fits.
4. `04` **"a drifted hunk matched through trailing whitespace does not rewrite the
   lines it landed on"** — tolerant matching + drift + the rule that context is
   copied from the file, so the file's own trailing spaces survive.
5. `05` **"a refused hunk in the middle leaves the file untouched and names the
   hunk"** — all-or-nothing composition plus the 1-based hunk number and the
   header line.
6. `06` **"a CRLF file and its LF twin differ on every line…"** — the line model,
   the alignment and the applier have to agree before the round trip closes.
7. `06` **"a patch with nothing in it is the identity"** — a behaviour no visible
   case touches; also the guard against a rewrite that turns "nothing to do" into
   an error.

## Guards (pass on the untouched fixture on purpose)

- `02` "a file that gains a trailing newline marks only the old side" — the marker
  direction the fixture happens to get right.
- `03` "a hunk that still sits where its header says is placed there with no
  offset" — mainline placement and the `offset: 0` report.
- `06` "a patch with nothing in it is the identity" — empty patch, file header
  only, empty file, identical inputs.
- `06` "lines and files: the empty text, the trailing newline and the empty line"
  — the `splitLines`/`joinLines` contract away from CRLF.

Four guards set the floor at 16%; the other twenty-one cases need work. A solution
that only greens `test/` (the header count form, the tie-break order, grouping, the
marker on the new side, a plain apply, all-or-nothing, the strict/tolerant switch,
indentation) lands near 12/25, because the visible suite never touches backward
drift, the upward drift limit, the search order, the lower bound, internal
whitespace runs, the malformed reasons, CRLF or most of the report fields.

## Notes on the design

- The tie-break is the one convention a reader will not guess: the document states
  that on an equally short path the **new** side advances first, so a replaced
  line reads `+new` then `-old`. The visible suite shows that shape in one
  reproduction, so the signal is available; the hidden cases use it inside
  grouping, round-trip and CRLF cases.
- `applyPatch` numbers hunks from 1 and reports exactly one error, for the first
  hunk it could not place; the visible suite asserts the same field, so the
  numbering is discoverable without the hidden suite.
- The library reads no clock, no random source and no filesystem; both suites are
  pure text in, text out, and `bin/unidiff.js` only touches stdin.
- The one interaction case the fixture already passes (`06`, the empty patch) is a
  guard as well; it is there to stop a rewrite from turning "nothing to do" into
  an error, which is a plausible over-correction once the malformed reports are
  added.
