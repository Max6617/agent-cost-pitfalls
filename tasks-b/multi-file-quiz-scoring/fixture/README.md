# quiz-scoring

Scores quiz attempts and ranks candidates for the certification export.

```
docs/scoring-rules.md   the rules the team signed off - treat as the contract
src/                    the implementation
src/sample.js           the demo quiz and attempts the export job prints
bin/score.js            `node bin/score.js` ranks the sample attempts
test/                   reproductions; a subset of what the export checks
```

## Use

```js
import { scoreQuestion, scoreSection, scoreQuiz, rankAttempts } from './src/index.js'

scoreQuestion(question, answer)   // points one answer contributes (signed)
scoreSection(section, answers)    // { sectionId, subtotal, scores: [{ questionId, score }] }
scoreQuiz(quiz, attempt)          // { candidateId, total, maxScore, bonusApplied, passed, sections }
rankAttempts(quiz, attempts)      // [{ candidateId, total, rank }], in published order
```

An attempt is `{ candidateId, answers: { [questionId]: answer }, bonus? }`.
The quiz shape — sections, questions, thresholds — is documented in
`docs/scoring-rules.md`. `scoreQuiz`'s `sections` entries are
`{ sectionId, subtotal, passed }`.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  reporting job imports these files directly.
- No dependencies. The export container has no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Nothing here reads the clock, randomness, or the filesystem; every value
  comes in as a parameter.
