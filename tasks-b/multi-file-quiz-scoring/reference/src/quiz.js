import { scoreSection } from './sections.js'
import { sum } from './util.js'

export function maxScoreOf(quiz) {
  return sum(quiz.sections.map((s) => sum(s.questions.map((q) => q.points))))
}

// Scores a whole attempt: every section, the bonus, and the pass verdict.
// Sections arrive already floored; the bonus is credited after, capped per quiz.
export function scoreQuiz(quiz, attempt) {
  const sections = quiz.sections.map((section) => {
    const result = scoreSection(section, attempt.answers ?? {})
    return {
      sectionId: section.id,
      subtotal: result.subtotal,
      passed: section.passScore === undefined || result.subtotal >= section.passScore,
    }
  })
  const bonus = attempt.bonus ?? 0
  const bonusApplied = quiz.bonusCap === undefined ? bonus : Math.min(bonus, quiz.bonusCap)
  const total = sum(sections.map((s) => s.subtotal)) + bonusApplied
  const passed = sections.every((s) => s.passed) && total >= quiz.passOverall
  return {
    candidateId: attempt.candidateId,
    total,
    maxScore: quiz.maxScore,
    bonusApplied,
    passed,
    sections,
  }
}
