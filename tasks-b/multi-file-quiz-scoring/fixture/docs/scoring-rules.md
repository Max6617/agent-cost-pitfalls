# Scoring rules

The rules the team signed off for the certification export. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Quizzes, sections, questions

```js
{
  id: 'onboarding-v3',
  maxScore: 30,                // the sum of the question points, declared on the quiz
  bonusCap: 4,                 // optional; see §4
  passOverall: 18,             // the total needed to pass; see §5
  tieBreakSection: 'methods',  // the section id that breaks ranking ties; see §6
  sections: [
    { id: 'basics', passScore: 5, questions: [ /* ... */ ] },   // passScore optional
    { id: 'methods', questions: [ /* ... */ ] },
  ],
}
```

An attempt is `{ candidateId, answers: { [questionId]: answer }, bonus? }`.
Answer values use the shapes in §2. An answer key that names no question in
the quiz is ignored. A question with no answer, a null answer, or an answer of
the wrong shape scores 0 and attracts no negative marking.

## 2. Question types

- `single` — `{ type, points, options, correct, negative? }`. The answer is one
  option id. A correct pick scores `points`. An incorrect pick — including a
  pick that is not one of `options` — scores `−negative` (default 0). The
  per-question breakdown keeps the sign.
- `true-false` — `{ type, points, correct }`, with `correct` a boolean. The
  answer must be a boolean. Right scores `points`; wrong scores 0.
- `ordering` — `{ type, points, items, correct }`. `items` is the display
  order; `correct` is the sequence that scores. The answer must list every
  item in exactly the `correct` sequence to score `points`; anything else
  scores 0. There is no partial credit for an almost-right sequence.
- `multi` — `{ type, points, options, correct, penalty? }`. The answer is a
  list of picks; a duplicated pick counts once. See §3.

## 3. Multi-answer partial credit

For a `multi` question worth `P` whose `correct` list has `n` entries, each
pick is worth a share of `P/n`:

- each pick that is in `correct` earns one share;
- each pick that is not in `correct` — including a pick that is not one of
  `options` at all — costs one share times `penalty` (default 0.5).

The question score is the sum, **floored at 0**: a multi question can never
report less than zero, however many wrong picks were made. It also never
exceeds `P`.

Worked examples, for `P = 6`, `correct = ['a', 'b', 'c']` (share 2, penalty 0.5):

| picks | score |
|---|---|
| `['a', 'b']` | 4 |
| `['a', 'b', 'd']` | 4 − 1 = 3 |
| `['d']` | 0 − 1 → floored to **0** |

## 4. Sections, bonus and the quiz total

A section's subtotal is the sum of its question scores, **floored at 0**: a
section can never report less than zero, even when negative marking outweighs
the earned points. The per-question breakdown keeps the signed scores; only
the subtotal is floored.

The quiz total is the sum of the section subtotals plus the credited bonus:

```
bonusApplied = min(attempt.bonus ?? 0, quiz.bonusCap)   // no bonusCap → credited in full
total = sum(section subtotals) + bonusApplied
```

The total is **not** capped at `maxScore`. Bonus points are real points: a
quiz scored 38 of 40 with 4 bonus points finishes at 42. `scoreQuiz` reports
what it credited as `bonusApplied`.

## 5. Passing

`passed` requires **both**:

- every section that declares a `passScore` reaches it (a section without one
  gates nothing), and
- the total reaches `passOverall`. The comparison is inclusive: a total
  exactly at `passOverall` passes.

A strong total cannot rescue a failed section, and strong sections cannot
rescue a shortfall in the total.

## 6. Ranking

`rankAttempts` produces the published order:

1. total, descending;
2. ties broken by the subtotal of the quiz's `tieBreakSection`, higher first;
3. any remaining tie broken by `candidateId`, ascending string order.

Every candidate gets a distinct 1-based rank. The published order must not
depend on the order the attempts were submitted in.
