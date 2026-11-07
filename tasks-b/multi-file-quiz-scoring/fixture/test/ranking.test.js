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

test('attempts rank by total, descending', () => {
  const ranked = rankAttempts(quiz, [
    { candidateId: 'cand-b', answers: { q1: 'a' } },
    { candidateId: 'cand-a', answers: { q1: 'a', q2: 'a', q3: 'a', q4: 'a' } },
    { candidateId: 'cand-c', answers: { q1: 'a', q3: 'a' } },
  ])
  assert.deepEqual(ranked.map((r) => r.candidateId), ['cand-a', 'cand-c', 'cand-b'])
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3])
})
