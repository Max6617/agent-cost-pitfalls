import { scoreQuestion } from './scoring.js'
import { sum } from './util.js'

// Scores every question in a section. The per-question breakdown keeps the
// signed values; the service combines the subtotals downstream.
export function scoreSection(section, answers = {}) {
  const scores = section.questions.map((q) => ({
    questionId: q.id,
    score: scoreQuestion(q, answers[q.id]),
  }))
  return { sectionId: section.id, subtotal: sum(scores.map((s) => s.score)), scores }
}
