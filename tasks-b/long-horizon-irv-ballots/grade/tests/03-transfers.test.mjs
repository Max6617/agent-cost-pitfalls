// Sub-problem 3: an eliminated candidate is out for good - later rounds never
// list them, preferences skip over them, and they receive no transfers.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

const electionOf = (candidates, ballots) => {
  const election = createElection({ candidates })
  election.addBallots(ballots)
  return election
}

test('a candidate eliminated two rounds ago stays out of the count', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'cy'), ballot('b2', 'ada', 'cy'), ballot('b3', 'ada', 'cy'),
    ballot('b4', 'cy', 'ada'), ballot('b5', 'cy', 'ada'),
    ballot('b6', 'bob', 'cy'), ballot('b7', 'bob', 'cy'),
    ballot('b8', 'di', 'cy'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'cy',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 2, di: 1 }, continuing: 8, majority: 5, eliminated: ['di'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2, cy: 3 }, continuing: 8, majority: 5, eliminated: ['bob'], winner: null },
      { round: 3, counts: { ada: 3, cy: 5 }, continuing: 8, majority: 5, eliminated: [], winner: 'cy' },
    ],
  })
})

test('transfers skip over every eliminated candidate, not just the latest', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'cy'), ballot('b2', 'ada', 'cy'), ballot('b3', 'ada', 'bob'),
    ballot('b4', 'cy', 'ada'), ballot('b5', 'cy', 'ada'), ballot('b6', 'cy', 'bob'),
    ballot('b7', 'bob', 'di', 'ada'), ballot('b8', 'bob', 'di', 'cy'),
    ballot('b9', 'di', 'cy'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'cy',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 3, di: 1 }, continuing: 9, majority: 5, eliminated: ['di'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2, cy: 4 }, continuing: 9, majority: 5, eliminated: ['bob'], winner: null },
      { round: 3, counts: { ada: 4, cy: 5 }, continuing: 9, majority: 5, eliminated: [], winner: 'cy' },
    ],
  })
})

test('a revived candidate must not be able to steal votes back from the winner', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'),
    ballot('b4', 'bob', 'ada'), ballot('b5', 'bob', 'ada'),
    ballot('b6', 'cy', 'di', 'ada'), ballot('b7', 'cy', 'di', 'ada'),
    ballot('b8', 'di', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 2, di: 1 }, continuing: 8, majority: 5, eliminated: ['di'], winner: null },
      { round: 2, counts: { ada: 3, bob: 3, cy: 2 }, continuing: 8, majority: 5, eliminated: ['cy'], winner: null },
      { round: 3, counts: { ada: 5, bob: 3 }, continuing: 8, majority: 5, eliminated: [], winner: 'ada' },
    ],
  })
})

test('ballots that rank only the eliminated exhaust, and the count reflects it', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'), ballot('b3', 'ada', 'cy'),
    ballot('b4', 'bob', 'ada'),
    ballot('b5', 'cy', 'ada'), ballot('b6', 'cy', 'bob'),
    ballot('b7', 'di'), ballot('b8', 'di'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 1, cy: 2, di: 2 }, continuing: 8, majority: 5, eliminated: ['bob'], winner: null },
      { round: 2, counts: { ada: 4, cy: 2, di: 2 }, continuing: 8, majority: 5, eliminated: ['di'], winner: null },
      { round: 3, counts: { ada: 4, cy: 2 }, continuing: 6, majority: 4, eliminated: [], winner: 'ada' },
    ],
  })
})

test('a straightforward two-round count with a transfer', () => {
  const election = electionOf(['ada', 'bob', 'cy'], [
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'), ballot('b3', 'ada', 'bob'),
    ballot('b4', 'bob', 'ada'), ballot('b5', 'bob', 'ada'),
    ballot('b6', 'cy', 'ada'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 1 }, continuing: 6, majority: 4, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 4, bob: 2 }, continuing: 6, majority: 4, eliminated: [], winner: 'ada' },
    ],
  })
})
