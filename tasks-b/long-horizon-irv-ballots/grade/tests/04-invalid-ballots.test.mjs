// Sub-problem 4: an invalid ballot - above all one that ranks the same
// candidate twice - is skipped entirely: not stored, not counted, id reusable.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

const electionOf = (candidates, ballots) => {
  const election = createElection({ candidates })
  const statuses = election.addBallots(ballots)
  return { election, statuses }
}

test('a duplicate-rank ballot is refused and counts in no round', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'),
    ballot('b3', 'bob', 'ada'), ballot('b4', 'bob', 'ada'),
    ballot('b5', 'cy', 'ada'),
  ])
  const refused = election.addBallot(ballot('b6', 'cy', 'bob', 'cy'))
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

test('a duplicate rank invalidates the ballot even when it is not the top rank', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'),
    ballot('b4', 'bob'), ballot('b5', 'bob'),
  ])
  const refused = election.addBallot(ballot('b6', 'bob', 'ada', 'bob'))
  assert.equal(refused.status, 'invalid')
  assert.equal(election.ballotCount(), 5)
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 0 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })
})

test('skipping an invalid ballot changes the bar as well as the counts', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'cy'), ballot('b2', 'ada', 'cy'),
    ballot('b3', 'bob'), ballot('b4', 'bob'), ballot('b5', 'bob', 'cy'),
    ballot('b6', 'cy'),
  ])
  const refused = election.addBallot(ballot('b7', 'bob', 'cy', 'bob'))
  assert.equal(refused.status, 'invalid')
  assert.equal(election.ballotCount(), 6)
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 3, cy: 1 }, continuing: 6, majority: 4, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 2, bob: 3 }, continuing: 5, majority: 3, eliminated: [], winner: 'bob' },
    ],
  })
})

test('a ballot ranking a candidate outside the field is invalid too', () => {
  const election = createElection({ candidates: ['ada', 'bob', 'cy'] })
  election.addBallots([
    ballot('b1', 'ada', 'bob'), ballot('b2', 'bob', 'ada'), ballot('b3', 'ada', 'bob'),
  ])
  const refused = election.addBallot(ballot('b4', 'ada', 'zelda'))
  assert.equal(refused.status, 'invalid')
  assert.equal(election.ballotCount(), 3)
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 1, cy: 0 }, continuing: 3, majority: 2, eliminated: [], winner: 'ada' },
    ],
  })
})

test('an invalid ballot stores nothing, so its id can be used again', () => {
  const election = createElection({ candidates: ['ada', 'bob'] })
  const first = election.addBallot(ballot('b1', 'ada', 'bob', 'ada'))
  const retry = election.addBallot(ballot('b1', 'ada', 'bob'))
  election.addBallots([ballot('b2', 'bob', 'ada'), ballot('b3', 'ada', 'bob')])
  assert.equal(first.status, 'invalid')
  assert.equal(retry.status, 'accepted')
  assert.equal(election.ballotCount(), 3)
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 1 }, continuing: 3, majority: 2, eliminated: [], winner: 'ada' },
    ],
  })
})
