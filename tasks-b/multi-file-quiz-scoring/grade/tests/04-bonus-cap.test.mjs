// Sub-problem 4: bonus is capped per quiz, credited after the section scores,
// and never clamped by the max score.
import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuiz } from '../src/index.js'

const single = (id, points, extra = {}) => ({
  id, type: 'single', points, options: ['a', 'b'], correct: 'a', ...extra,
})

function quiz(sections, overrides = {}) {
  return { id: 'q', maxScore: 40, bonusCap: 5, passOverall: 10, tieBreakSection: 's1', sections, ...overrides }
}

test('bonus points take the total above the max score', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 20)] },
    { id: 's2', questions: [single('q2', 20)] },
  ])
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a' }, bonus: 3 })
  assert.equal(result.total, 43)
  assert.equal(result.bonusApplied, 3)
})

test('the credited bonus is capped at the quiz bonusCap', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 20)] },
    { id: 's2', questions: [single('q2', 10)] },
  ], { maxScore: 30 })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a' }, bonus: 9 })
  assert.equal(result.bonusApplied, 5)
  assert.equal(result.total, 35)
})

test('a negative section is floored before the bonus is credited', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 8, { negative: 4 })] },
    { id: 's2', questions: [single('q2', 20)] },
  ], { maxScore: 28 })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'b', q2: 'a' }, bonus: 6 })
  assert.equal(result.bonusApplied, 5)
  assert.equal(result.total, 25)
})

test('a quiz without a bonusCap credits the bonus in full', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 20)] },
    { id: 's2', questions: [single('q2', 18)] },
  ], { maxScore: 38 })
  delete q.bonusCap
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a' }, bonus: 9 })
  assert.equal(result.total, 47)
  assert.equal(result.bonusApplied, 9)
})
