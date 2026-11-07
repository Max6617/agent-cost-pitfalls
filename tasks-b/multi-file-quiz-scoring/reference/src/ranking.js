import { scoreQuiz } from './quiz.js'
import { compareStrings } from './util.js'

// Ranks attempts for publication. docs/scoring-rules.md pins the order:
// total desc, then the tie-break section's subtotal desc, then candidate id asc.
export function rankAttempts(quiz, attempts) {
  const scored = attempts.map((attempt) => {
    const result = scoreQuiz(quiz, attempt)
    const tie = result.sections.find((s) => s.sectionId === quiz.tieBreakSection)?.subtotal ?? 0
    return { candidateId: attempt.candidateId, total: result.total, tie }
  })
  scored.sort((a, b) => b.total - a.total || b.tie - a.tie || compareStrings(a.candidateId, b.candidateId))
  return scored.map((entry, i) => ({ candidateId: entry.candidateId, total: entry.total, rank: i + 1 }))
}
