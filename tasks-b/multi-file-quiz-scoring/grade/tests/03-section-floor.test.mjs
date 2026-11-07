// Sub-problem 3: section subtotals are floored at zero; the breakdown keeps signs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreSection, scoreQuiz } from '../src/index.js'

const single = (id, points, extra = {}) => ({
  id, type: 'single', points, options: ['a', 'b'], correct: 'a', ...extra,
})

test('two wrong picks cannot take a section below zero', () => {
  const section = { id: 's', questions: [single('q1', 3, { negative: 1 }), single('q2', 3, { negative: 1 })] }
  const result = scoreSection(section, { q1: 'b', q2: 'b' })
  assert.equal(result.subtotal, 0)
})

test('an unanswered question attracts no negative marking', () => {
  const section = { id: 's', questions: [single('q1', 3, { negative: 2 }), single('q2', 3, { negative: 1 })] }
  const result = scoreSection(section, { q1: 'b' })
  assert.equal(result.subtotal, 0)
})

test('a negative section does not eat into the other sections', () => {
  const quiz = {
    id: 'q', maxScore: 7, passOverall: 0, tieBreakSection: 's2',
    sections: [
      { id: 's1', questions: [single('q1', 2, { negative: 3 })] },
      { id: 's2', questions: [single('q2', 5)] },
    ],
  }
  const result = scoreQuiz(quiz, { candidateId: 'c', answers: { q1: 'b', q2: 'a' } })
  assert.equal(result.sections[0].subtotal, 0)
  assert.equal(result.total, 5)
})

test('the per-question breakdown keeps the signed scores', () => {
  const section = {
    id: 's',
    questions: [
      single('q1', 3, { negative: 1 }),
      single('q2', 3, { negative: 2 }),
      single('q3', 3, { negative: 1 }),
    ],
  }
  const result = scoreSection(section, { q1: 'b', q2: 'b', q3: 'b' })
  assert.deepEqual(result.scores.map((s) => s.score), [-1, -2, -1])
  assert.equal(result.subtotal, 0)
})
