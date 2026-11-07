import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuestion } from '../src/index.js'

const multi = { id: 'm1', type: 'multi', points: 6, options: ['a', 'b', 'c', 'd'], correct: ['a', 'b', 'c'] }

const steps = {
  id: 'o1', type: 'ordering', points: 3,
  items: ['draft', 'review', 'approve', 'publish'],
  correct: ['review', 'draft', 'approve', 'publish'],
}

test('multi: partial credit for a mix of right and wrong picks', () => {
  assert.equal(scoreQuestion(multi, ['a', 'b', 'd']), 3)
})

test('multi: a question can never score below zero', () => {
  assert.equal(scoreQuestion(multi, ['d']), 0)
})

test('ordering: the correct sequence scores full points', () => {
  assert.equal(scoreQuestion(steps, ['review', 'draft', 'approve', 'publish']), 3)
})

test('ordering: the display order is not the scoring sequence', () => {
  assert.equal(scoreQuestion(steps, ['draft', 'review', 'approve', 'publish']), 0)
})
