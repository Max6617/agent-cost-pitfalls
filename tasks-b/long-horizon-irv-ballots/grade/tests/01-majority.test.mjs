// Sub-problem 1: a majority is strictly more than half of the CONTINUING
// ballots - ballots that have left the count do not set the bar.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

const electionOf = (candidates, ballots) => {
  const election = createElection({ candidates })
  election.addBallots(ballots)
  return election
}

test('exhausted ballots lower the bar for the rounds that follow', () => {
  const election = electionOf(['ada', 'bob', 'cy'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'),
    ballot('b3', 'bob'), ballot('b4', 'bob'), ballot('b5', 'bob'),
    ballot('b6', 'cy'), ballot('b7', 'cy'), ballot('b8', 'cy'), ballot('b9', 'cy'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'cy',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 3, cy: 4 }, continuing: 9, majority: 5, eliminated: ['ada'], winner: null },
      { round: 2, counts: { bob: 3, cy: 4 }, continuing: 7, majority: 4, eliminated: [], winner: 'cy' },
    ],
  })
})

test('a candidate exactly at the bar wins; the bar follows the continuing count', () => {
  const election = electionOf(['ada', 'bob', 'cy'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'),
    ballot('b4', 'bob'), ballot('b5', 'bob'),
    ballot('b6', 'cy'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 1 }, continuing: 6, majority: 4, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })
})

test('an outright majority in the first round ends the count', () => {
  const election = electionOf(['ada', 'bob', 'cy'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'),
    ballot('b4', 'bob'), ballot('b5', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 0 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })
})

test('a fully tied field is whittled down until one ballot is the count', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'cy'), ballot('b2', 'bob', 'cy'),
    ballot('b3', 'cy'), ballot('b4', 'di', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'cy',
    rounds: [
      { round: 1, counts: { ada: 1, bob: 1, cy: 1, di: 1 }, continuing: 4, majority: 3, eliminated: ['ada'], winner: null },
      { round: 2, counts: { bob: 1, cy: 2, di: 1 }, continuing: 4, majority: 3, eliminated: ['di'], winner: null },
      { round: 3, counts: { bob: 2, cy: 2 }, continuing: 4, majority: 3, eliminated: ['bob'], winner: null },
      { round: 4, counts: { cy: 3 }, continuing: 3, majority: 2, eliminated: [], winner: 'cy' },
    ],
  })
})

test('with one continuing ballot the bar is one', () => {
  const election = electionOf(['ada', 'bob'], [
    ballot('b1', 'ada'),
    ballot('b2', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 1, bob: 1 }, continuing: 2, majority: 2, eliminated: ['ada'], winner: null },
      { round: 2, counts: { bob: 1 }, continuing: 1, majority: 1, eliminated: [], winner: 'bob' },
    ],
  })
})
