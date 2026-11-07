# multi-file-quiz-scoring

stratum: multi-file

A quiz-scoring service (questions, scoring, sections, quiz, ranking). The
written contract is `fixture/docs/scoring-rules.md`; the public surface is
`src/index.js` (`scoreQuestion`, `scoreSection`, `scoreQuiz`, `rankAttempts`).

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| 01-ordering | an ordering question scores against `correct`, not the display order | `src/questions.js` compares the answer to `question.items` (wrong field) |
| 02-multi-partial-credit | multi partial credit: proportional, penalty per wrong pick, floored at 0 per question | `src/scoring.js` caps at full points but never floors, so wrong picks take a question negative |
| 03-section-floor | negative marking floored at 0 per section; breakdown keeps signed scores | `src/sections.js` returns the raw sum; the only floor is at quiz-total level in `src/quiz.js` |
| 04-bonus-cap | bonus credited after the section floors, capped at `bonusCap`, never clamped by `maxScore` | `src/quiz.js` folds the raw bonus in and clamps the total to `maxScore`; `bonusCap` is never read |
| 05-pass-thresholds | passing needs every gated section AND the total; boundary is inclusive | no logic bug of its own — verdicts move through the floor/bonus bugs (guards + interactions) |
| 06-ranking | total desc, tie-break section subtotal desc, candidate id asc | `src/ranking.js` sorts by total only, so ties keep submission order |

Five modules must change (`questions.js`, `scoring.js`, `sections.js`,
`quiz.js`, `ranking.js`). The prompt hints at four of them; the ordering bug
behind `questions.js` is not hinted at.

Guards (pass on the untouched fixture, 4 = the max):

- 01: *when the display order is the correct sequence, that answer scores*
- 05: *a strong total cannot rescue a section below its passScore*
- 05: *a total exactly at passOverall passes*
- 06: *distinct totals rank descending*

Interaction cases (9): 01/section aggregation (01 case 4); behaviours the
visible suite never touches — unknown pick counts as an incorrect pick (02
case 4), an unanswered question attracts no negative marking (03 case 2);
two sub-problems at once — negative section across the quiz total (03 case 3),
floor before bonus (04 case 3), missing `bonusCap` (04 case 4), floored
section across `passOverall` (05 case 2), credited bonus across `passOverall`
(05 case 3), submission-order independence (06 case 4).

## measured

Gate (`node tasks-b/_tools/verify-task.mjs multi-file-quiz-scoring`), run twice
with identical output:

- untouched fixture: visible 5/8 pass, exit 1 (3 failing: multi floor,
  ordering x2); hidden **4/24 = 17%** (exactly the 4 guards — no free points)
- reference: visible 8/8 pass, exit 0; hidden **24/24 = 100%**

Reference changes 5 files: `src/{questions,scoring,sections,quiz,ranking}.js`.
Fixture shape: 15 text files, 475 lines.

Visible-green estimate: the visible suite exercises only 01/02 fully (plus
passers), so greening it fixes two files and lands ~11/24 (46%); the rest
requires reading `docs/` — the section floor, the bonus cap and the ranking
tie-break are documented but unreproduced.
