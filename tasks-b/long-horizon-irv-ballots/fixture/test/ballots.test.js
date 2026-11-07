import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

test('a ballot that ranks the same candidate twice is skipped', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'cy'), ballot('b2', 'ada', 'cy'),
    ballot('b3', 'bob', 'ada'), ballot('b4', 'bob', 'ada'),
    ballot('b5', 'cy', 'ada'),
  ])
  const refused = election.addBallot(ballot('b6', 'bob', 'cy', 'bob'))
  assert.equal(refused.status, 'invalid')
  assert.equal(election.ballotCount(), 5)
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 2, cy: 1 }, continuing: 5, majority: 3, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })
})

test('an invalid ballot stores nothing, so its id can be used again', () => {
  const election = createElection({ candidates: ['ada', 'bob'] })
  const first = election.addBallot(ballot('b1', 'bob', 'ada', 'bob'))
  const retry = election.addBallot(ballot('b1', 'bob', 'ada'))
  election.addBallots([ballot('b2', 'ada', 'bob'), ballot('b3', 'bob', 'ada')])
  assert.equal(first.status, 'invalid')
  assert.equal(retry.status, 'accepted')
  assert.equal(election.ballotCount(), 3)
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 1, bob: 2 }, continuing: 3, majority: 2, eliminated: [], winner: 'bob' },
    ],
  })
})

test('a tally reports every ballot accepted before it is called', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'bob')])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 1, cy: 0 }, continuing: 3, majority: 2, eliminated: [], winner: 'ada' },
    ],
  })

  election.addBallots([ballot('b4', 'bob'), ballot('b5', 'bob'), ballot('b6', 'bob')])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 4, cy: 0 }, continuing: 6, majority: 4, eliminated: [], winner: 'bob' },
    ],
  })
})

test('an invalid ballot changes nothing about the count', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'),
    ballot('b3', 'bob', 'ada'), ballot('b4', 'bob', 'ada'),
    ballot('b5', 'cy', 'ada'),
  ])
  const before = election.tally()
  const refused = election.addBallot(ballot('b6', 'ada', 'bob', 'ada'))
  assert.equal(refused.status, 'invalid')
  assert.equal(election.ballotCount(), 5)
  assert.deepEqual(election.tally(), before)
})
