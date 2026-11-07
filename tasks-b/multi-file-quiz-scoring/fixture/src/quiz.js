import { scoreSection } from './sections.js'
import { sum } from './util.js'

export function maxScoreOf(quiz) {
  return sum(quiz.sections.map((s) => sum(s.questions.map((q) => q.points))))
}

// Scores a whole attempt: every section, the bonus, and the pass verdict.
export function scoreQuiz(quiz, attempt) {
  const sections = quiz.sections.map((section) => {
    const result = scoreSection(section, attempt.answers ?? {})
    return {
      sectionId: section.id,
      subtotal: result.subtotal,
      passed: section.passScore === undefined || result.subtotal >= section.passScore,
    }
  })
  const earned = sum(sections.map((s) => s.subtotal))
  const bonus = attempt.bonus ?? 0
  // a quiz total never drops below zero and never exceeds the max score
  const total = Math.max(0, Math.min(earned + bonus, quiz.maxScore))
  const passed = sections.every((s) => s.passed) && total >= quiz.passOverall
  return {
    candidateId: attempt.candidateId,
    total,
    maxScore: quiz.maxScore,
    bonusApplied: bonus,
    passed,
    sections,
  }
}
