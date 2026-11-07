import { scoreQuiz } from './quiz.js'

// Ranks attempts for publication. docs/scoring-rules.md pins the order.
export function rankAttempts(quiz, attempts) {
  const scored = attempts.map((attempt) => {
    const result = scoreQuiz(quiz, attempt)
    return { candidateId: attempt.candidateId, total: result.total }
  })
  scored.sort((a, b) => b.total - a.total)
  return scored.map((entry, i) => ({ candidateId: entry.candidateId, total: entry.total, rank: i + 1 }))
}
