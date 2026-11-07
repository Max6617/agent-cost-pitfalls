import { isAnswered, picksOf, checkSingle, checkTrueFalse, checkOrdering } from './questions.js'

export const DEFAULT_MULTI_PENALTY = 0.5

// The points a single answer contributes to its section. The per-type rules,
// including the partial-credit formula for multi, are in docs/scoring-rules.md.
export function scoreQuestion(question, answer) {
  if (!isAnswered(question, answer)) return 0
  switch (question.type) {
    case 'single':
      return checkSingle(question, answer) ? question.points : -(question.negative ?? 0)
    case 'true-false':
      return checkTrueFalse(question, answer) ? question.points : 0
    case 'ordering':
      return checkOrdering(question, answer) ? question.points : 0
    case 'multi': {
      const share = question.points / question.correct.length
      const penalty = question.penalty ?? DEFAULT_MULTI_PENALTY
      let hits = 0
      let misses = 0
      for (const pick of picksOf(answer)) {
        if (question.correct.includes(pick)) hits += 1
        else misses += 1
      }
      return Math.min(question.points, hits * share - misses * share * penalty)
    }
    default:
      return 0
  }
}
