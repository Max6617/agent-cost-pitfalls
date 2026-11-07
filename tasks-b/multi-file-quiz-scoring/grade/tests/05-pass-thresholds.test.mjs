// Sub-problem 5: passing needs every gated section AND the overall total.
import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuiz } from '../src/index.js'

const single = (id, points, extra = {}) => ({
  id, type: 'single', points, options: ['a', 'b'], correct: 'a', ...extra,
})

function quiz(sections, overrides = {}) {
  return { id: 'q', maxScore: 40, bonusCap: 5, passOverall: 20, tieBreakSection: 's1', sections, ...overrides }
}

test('a strong total cannot rescue a section below its passScore', () => {
  const q = quiz([
    { id: 's1', passScore: 4, questions: [single('q1', 3)] },
    { id: 's2', questions: [single('q2', 20)] },
  ], { maxScore: 23 })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a' } })
  assert.equal(result.total, 23)
  assert.equal(result.passed, false)
})

test('a floored section still counts its zero towards the total', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 2, { negative: 3 })] },
    { id: 's2', passScore: 5, questions: [single('q2', 18)] },
  ], { maxScore: 20, passOverall: 17 })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'b', q2: 'a' } })
  assert.equal(result.total, 18)
  assert.equal(result.passed, true)
})

test('credited bonus points count towards the overall threshold', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 20)] },
    { id: 's2', questions: [single('q2', 19)] },
  ], { maxScore: 39, passOverall: 42 })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a' }, bonus: 9 })
  assert.equal(result.total, 44)
  assert.equal(result.passed, true)
})

test('a total exactly at passOverall passes', () => {
  const q = quiz([
    { id: 's1', questions: [single('q1', 12)] },
    { id: 's2', questions: [single('q2', 8)] },
  ], { maxScore: 20 })
  const result = scoreQuiz(q, { candidateId: 'c', answers: { q1: 'a', q2: 'a' } })
  assert.equal(result.total, 20)
  assert.equal(result.passed, true)
})
