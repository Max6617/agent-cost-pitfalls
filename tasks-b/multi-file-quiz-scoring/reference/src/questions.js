// Answer-shape validation and per-type correctness checks.
// Scoring lives in scoring.js; this module only knows what an answer looks
// like and whether it matches the key.

export function isAnswered(question, answer) {
  if (answer === undefined || answer === null) return false
  switch (question.type) {
    case 'single':
      return typeof answer === 'string'
    case 'true-false':
      return typeof answer === 'boolean'
    case 'multi':
    case 'ordering':
      return Array.isArray(answer)
    default:
      return false
  }
}

// The candidate's picks with duplicates removed, first occurrence kept.
export function picksOf(answer) {
  return [...new Set(answer)]
}

export function checkSingle(question, answer) {
  return answer === question.correct
}

export function checkTrueFalse(question, answer) {
  return answer === question.correct
}

export function checkOrdering(question, answer) {
  const expected = question.correct
  if (answer.length !== expected.length) return false
  return answer.every((item, i) => item === expected[i])
}
