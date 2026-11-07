// Sub-problem 1: ordering questions score against the correct sequence.
import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuestion, scoreSection } from '../src/index.js'

const steps = {
  id: 'steps', type: 'ordering', points: 3,
  items: ['draft', 'review', 'approve', 'publish'],
  correct: ['review', 'draft', 'approve', 'publish'],
}

test('an answer in the correct sequence scores full points', () => {
  assert.equal(scoreQuestion(steps, ['review', 'draft', 'approve', 'publish']), 3)
})

test('an answer in display order is not the correct sequence', () => {
  assert.equal(scoreQuestion(steps, ['draft', 'review', 'approve', 'publish']), 0)
})

test('when the display order is the correct sequence, that answer scores', () => {
  const q = { id: 'seq', type: 'ordering', points: 2, items: ['a', 'b', 'c'], correct: ['a', 'b', 'c'] }
  assert.equal(scoreQuestion(q, ['a', 'b', 'c']), 2)
})

test('an ordering question inside a section contributes its points to the subtotal', () => {
  const section = {
    id: 's',
    questions: [
      { id: 'm', type: 'multi', points: 4, options: ['a', 'b'], correct: ['a', 'b'] },
      steps,
    ],
  }
  const result = scoreSection(section, { m: ['a', 'b'], steps: ['review', 'draft', 'approve', 'publish'] })
  assert.equal(result.subtotal, 7)
})
