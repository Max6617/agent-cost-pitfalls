// Sub-problem 5: tallying is a pure read - it reports every ballot accepted
// before it is called, however many times it has been called before.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

test('a ballot id already in the count is refused as a duplicate', () => {
  const election = createElection({ candidates: ['ada', 'bob'] })
  const first = election.addBallot(ballot('b1', 'ada', 'bob'))
  const again = election.addBallot(ballot('b1', 'bob', 'ada'))
  election.addBallots([ballot('b2', 'bob', 'ada'), ballot('b3', 'ada', 'bob')])
  assert.equal(first.status, 'accepted')
  assert.equal(again.status, 'duplicate')
  assert.equal(election.ballotCount(), 3)
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 1 }, continuing: 3, majority: 2, eliminated: [], winner: 'ada' },
    ],
  })
})

test('a tally reports every ballot accepted before it is called', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'), ballot('b4', 'bob')])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 1, cy: 0 }, continuing: 4, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })

  election.addBallots([ballot('b5', 'bob'), ballot('b6', 'bob'), ballot('b7', 'bob'), ballot('b8', 'bob')])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 5, cy: 0 }, continuing: 8, majority: 5, eliminated: [], winner: 'bob' },
    ],
  })
})

test('an invalid ballot changes nothing about the count', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'),
    ballot('b3', 'bob', 'ada'), ballot('b4', 'bob', 'ada'),
    ballot('b5', 'cy', 'bob'),
  ])
  const before = election.tally()
  const refused = election.addBallot(ballot('b6', 'cy', 'ada', 'cy'))
  assert.equal(refused.status, 'invalid')
  assert.equal(election.ballotCount(), 5)
  assert.deepEqual(election.tally(), before)
})

test('ballots added after a tally join the count like any others', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'cy'), ballot('b2', 'ada', 'cy'),
    ballot('b3', 'bob', 'cy'), ballot('b4', 'bob', 'cy'),
    ballot('b5', 'cy', 'ada'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 2, cy: 1 }, continuing: 5, majority: 3, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })

  election.addBallots([ballot('b6', 'cy', 'bob'), ballot('b7', 'cy', 'bob')])
  assert.deepEqual(election.tally(), {
    winner: 'cy',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 2, cy: 3 }, continuing: 7, majority: 4, eliminated: ['ada'], winner: null },
      { round: 2, counts: { bob: 2, cy: 5 }, continuing: 7, majority: 4, eliminated: [], winner: 'cy' },
    ],
  })
})

test('a tally after late ballots run deep into the count still follows the rules', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy', 'di'] })
  election.addBallots([
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'), ballot('b4', 'ada'),
    ballot('b5', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 4, bob: 1, cy: 0, di: 0 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })

  election.addBallots([
    ballot('b6', 'bob', 'di', 'ada'), ballot('b7', 'bob', 'di', 'ada'),
    ballot('b8', 'cy', 'bob', 'ada'), ballot('b9', 'cy', 'bob', 'ada'),
    ballot('b10', 'di', 'bob', 'ada'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 4, bob: 3, cy: 2, di: 1 }, continuing: 10, majority: 6, eliminated: ['di'], winner: null },
      { round: 2, counts: { ada: 4, bob: 4, cy: 2 }, continuing: 10, majority: 6, eliminated: ['cy'], winner: null },
      { round: 3, counts: { ada: 4, bob: 6 }, continuing: 10, majority: 6, eliminated: [], winner: 'bob' },
    ],
  })
})
