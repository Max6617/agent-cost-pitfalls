// Sub-problem 2: multi-answer partial credit, floored at zero per question.
import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuestion } from '../src/index.js'

const pick3 = { id: 'm', type: 'multi', points: 6, options: ['a', 'b', 'c', 'd'], correct: ['a', 'b', 'c'] }

test('a wrong pick with no right picks floors to zero', () => {
  assert.equal(scoreQuestion(pick3, ['d']), 0)
})

test('every pick wrong still floors to zero', () => {
  const q = { id: 'm', type: 'multi', points: 6, options: ['a', 'b', 'c', 'd'], correct: ['a', 'b'] }
  assert.equal(scoreQuestion(q, ['c', 'd']), 0)
})

test('a harsher per-question penalty cannot push the score below zero', () => {
  const q = { id: 'm', type: 'multi', points: 4, options: ['a', 'b', 'c'], correct: ['a', 'b'], penalty: 1 }
  assert.equal(scoreQuestion(q, ['c']), 0)
})

test('a pick that is not an option counts as an incorrect pick', () => {
  assert.equal(scoreQuestion(pick3, ['zzz']), 0)
})
