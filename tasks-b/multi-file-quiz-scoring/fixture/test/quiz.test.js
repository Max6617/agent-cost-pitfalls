import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuiz } from '../src/index.js'

const single = (id, points, extra = {}) => ({
  id, type: 'single', points, options: ['a', 'b'], correct: 'a', ...extra,
})

function quiz(overrides = {}) {
  return {
    id: 'q', maxScore: 40, bonusCap: 5, passOverall: 20, tieBreakSection: 's2',
    sections: [
      { id: 's1', questions: [single('q1', 20)] },
      { id: 's2', questions: [single('q2', 10), single('q3', 10)] },
    ],
    ...overrides,
  }
}

test('a quiz with no bonus scores the sum of its sections', () => {
  const result = scoreQuiz(quiz(), { candidateId: 'c', answers: { q1: 'a', q2: 'a', q3: 'b' } })
  assert.equal(result.total, 30)
})

test('bonus points credit on top of the section sum', () => {
  const result = scoreQuiz(quiz(), { candidateId: 'c', answers: { q1: 'a', q2: 'a' }, bonus: 2 })
  assert.equal(result.total, 32)
  assert.equal(result.bonusApplied, 2)
})

test('a strong total cannot rescue a section below its passScore', () => {
  const q = quiz({
    sections: [
      { id: 's1', passScore: 21, questions: [single('q1', 20)] },
      { id: 's2', questions: [single('q2', 10), single('q3', 10)] },
    ],
  })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a', q3: 'a' } })
  assert.equal(result.total, 40)
  assert.equal(result.passed, false)
})
