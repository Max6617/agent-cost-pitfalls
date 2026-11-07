import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

const electionOf = (candidates, ballots) => {
  const election = createElection({ candidates })
  election.addBallots(ballots)
  return election
}

test('a candidate wins with more than half of the ballots still in the count', () => {
  const election = electionOf(['ada', 'bob', 'cy'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'),
    ballot('b4', 'bob'), ballot('b5', 'bob'), ballot('b6', 'bob'), ballot('b7', 'bob'),
    ballot('b8', 'cy'), ballot('b9', 'cy'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 4, cy: 2 }, continuing: 9, majority: 5, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 3, bob: 4 }, continuing: 7, majority: 4, eliminated: [], winner: 'bob' },
    ],
  })
})

test('exactly half of the continuing ballots is not a majority', () => {
  const election = electionOf(['ada', 'bob'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'),
    ballot('b3', 'bob'), ballot('b4', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 2, bob: 2 }, continuing: 4, majority: 3, eliminated: ['ada'], winner: null },
      { round: 2, counts: { bob: 2 }, continuing: 2, majority: 2, eliminated: [], winner: 'bob' },
    ],
  })
})

test('a tie for last place goes to the candidate with less support still coming', () => {
  const election = electionOf(['ada', 'bob', 'cy'], [
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'), ballot('b3', 'ada', 'cy'),
    ballot('b4', 'bob', 'ada'), ballot('b5', 'bob', 'ada'),
    ballot('b6', 'cy', 'ada'), ballot('b7', 'cy', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 2 }, continuing: 7, majority: 4, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 4, bob: 3 }, continuing: 7, majority: 4, eliminated: [], winner: 'ada' },
    ],
  })
})

test('the arrival order of the ballots never changes the outcome', () => {
  const ballots = [
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'), ballot('b3', 'ada', 'cy'),
    ballot('b4', 'bob', 'ada'), ballot('b5', 'bob', 'ada'),
    ballot('b6', 'cy', 'ada'), ballot('b7', 'cy', 'bob'),
  ]
  const forwards = electionOf(['ada', 'bob', 'cy'], ballots)
  const backwards = electionOf(['ada', 'bob', 'cy'], [...ballots].reverse())
  assert.deepEqual(backwards.tally(), forwards.tally())
  assert.equal(forwards.tally().winner, 'ada')
})

test('an eliminated candidate never reappears in later rounds', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'bob'), ballot('b3', 'ada', 'cy'),
    ballot('b4', 'bob', 'ada'), ballot('b5', 'bob', 'ada'),
    ballot('b6', 'cy', 'ada'), ballot('b7', 'cy', 'bob'),
    ballot('b8', 'di', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 2, di: 1 }, continuing: 8, majority: 5, eliminated: ['di'], winner: null },
      { round: 2, counts: { ada: 3, bob: 3, cy: 2 }, continuing: 8, majority: 5, eliminated: ['cy'], winner: null },
      { round: 3, counts: { ada: 4, bob: 4 }, continuing: 8, majority: 5, eliminated: ['ada'], winner: null },
      { round: 4, counts: { bob: 6 }, continuing: 6, majority: 4, eliminated: [], winner: 'bob' },
    ],
  })
})

test('preferences skip over candidates who are already out', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada'), ballot('b2', 'ada'), ballot('b3', 'ada'),
    ballot('b4', 'bob', 'ada'), ballot('b5', 'bob', 'ada'),
    ballot('b6', 'cy', 'bob'),
    ballot('b7', 'di', 'bob'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'bob',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 1, di: 1 }, continuing: 7, majority: 4, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 3, bob: 3, di: 1 }, continuing: 7, majority: 4, eliminated: ['di'], winner: null },
      { round: 3, counts: { ada: 3, bob: 4 }, continuing: 7, majority: 4, eliminated: [], winner: 'bob' },
    ],
  })
})
