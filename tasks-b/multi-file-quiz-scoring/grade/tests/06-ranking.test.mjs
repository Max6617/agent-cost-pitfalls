// Sub-problem 6: the published order is pinned: total, tie-break section, id.
import test from 'node:test'
import assert from 'node:assert/strict'
import { rankAttempts } from '../src/index.js'

const single = (id, points) => ({ id, type: 'single', points, options: ['a', 'b'], correct: 'a' })

const quiz = {
  id: 'q', maxScore: 24, passOverall: 0, tieBreakSection: 's2',
  sections: [
    { id: 's1', questions: [single('q1', 6), single('q2', 4)] },
    { id: 's2', questions: [single('q3', 10), single('q4', 4)] },
  ],
}

const xAnswers = { q1: 'a', q2: 'a', q3: 'a' }          // total 20, tie-break 10
const yAnswers = { q1: 'a', q3: 'a', q4: 'a' }          // total 20, tie-break 14
const zAnswers = { q2: 'a', q3: 'a', q4: 'a' }          // total 18

test('distinct totals rank descending', () => {
  const ranked = rankAttempts(quiz, [
    { candidateId: 'cand-b', answers: { q1: 'a' } },
    { candidateId: 'cand-a', answers: { q1: 'a', q2: 'a', q3: 'a', q4: 'a' } },
    { candidateId: 'cand-c', answers: { q1: 'a', q3: 'a' } },
  ])
  assert.deepEqual(ranked.map((r) => r.candidateId), ['cand-a', 'cand-c', 'cand-b'])
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3])
})

test('equal totals are broken by the tie-break section', () => {
  const ranked = rankAttempts(quiz, [
    { candidateId: 'cand-x', answers: xAnswers },
    { candidateId: 'cand-y', answers: yAnswers },
  ])
  assert.deepEqual(ranked.map((r) => r.candidateId), ['cand-y', 'cand-x'])
})

test('a full tie is broken by candidate id, ascending', () => {
  const ranked = rankAttempts(quiz, [
    { candidateId: 'cand-b', answers: xAnswers },
    { candidateId: 'cand-a', answers: xAnswers },
  ])
  assert.deepEqual(ranked.map((r) => r.candidateId), ['cand-a', 'cand-b'])
})

test('the published order does not depend on submission order', () => {
  const ranked = rankAttempts(quiz, [
    { candidateId: 'cand-x', answers: xAnswers },
    { candidateId: 'cand-z', answers: zAnswers },
    { candidateId: 'cand-y', answers: yAnswers },
  ])
  assert.deepEqual(ranked.map((r) => r.candidateId), ['cand-y', 'cand-x', 'cand-z'])
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3])
})
