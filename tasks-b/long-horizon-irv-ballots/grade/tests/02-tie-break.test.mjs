// Sub-problem 2: ties for last place are broken by fewest transfer count,
// then by lowest candidate id - never by the order votes happened to arrive.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createElection } from '../src/index.js'

const ballot = (id, ...ranks) => ({ id, ranks })

const electionOf = (candidates, ballots) => {
  const election = createElection({ candidates })
  election.addBallots(ballots)
  return election
}

const s1Ballots = [
  ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'cy'),
  ballot('b3', 'bob', 'ada'), ballot('b4', 'bob', 'ada'),
  ballot('b5', 'cy', 'bob'), ballot('b6', 'cy', 'ada'),
  ballot('b7', 'ada', 'bob'),
]

const s1Result = {
  winner: 'ada',
  rounds: [
    { round: 1, counts: { ada: 3, bob: 2, cy: 2, di: 0 }, continuing: 7, majority: 4, eliminated: ['di'], winner: null },
    { round: 2, counts: { ada: 3, bob: 2, cy: 2 }, continuing: 7, majority: 4, eliminated: ['cy'], winner: null },
    { round: 3, counts: { ada: 4, bob: 3 }, continuing: 7, majority: 4, eliminated: [], winner: 'ada' },
  ],
}

test('a tie for last place goes to the candidate with the fewest transfers waiting', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], s1Ballots)
  assert.deepEqual(election.tally(), s1Result)
})

test('when transfers also tie, the lowest candidate id leaves the race', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'cy', 'bob', 'ada'),
    ballot('b2', 'bob', 'cy', 'ada'),
    ballot('b3', 'ada', 'bob', 'cy'),
    ballot('b4', 'ada', 'di'), ballot('b5', 'ada', 'di'),
    ballot('b6', 'bob', 'ada'),
    ballot('b7', 'cy', 'ada'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 2, di: 0 }, continuing: 7, majority: 4, eliminated: ['di'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2, cy: 2 }, continuing: 7, majority: 4, eliminated: ['bob'], winner: null },
      { round: 3, counts: { ada: 4, cy: 3 }, continuing: 7, majority: 4, eliminated: [], winner: 'ada' },
    ],
  })
})

test('each round settles its own ties, however deep the count runs', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'bob', 'cy', 'di'), ballot('b2', 'ada', 'bob', 'di', 'cy'), ballot('b3', 'ada', 'cy', 'bob', 'di'),
    ballot('b4', 'bob', 'ada', 'cy', 'di'), ballot('b5', 'bob', 'ada', 'di', 'cy'),
    ballot('b6', 'di', 'cy', 'bob', 'ada'),
    ballot('b7', 'cy', 'di', 'bob', 'ada'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 2, cy: 1, di: 1 }, continuing: 7, majority: 4, eliminated: ['cy'], winner: null },
      { round: 2, counts: { ada: 3, bob: 2, di: 2 }, continuing: 7, majority: 4, eliminated: ['bob'], winner: null },
      { round: 3, counts: { ada: 5, di: 2 }, continuing: 7, majority: 4, eliminated: [], winner: 'ada' },
    ],
  })
})

test('the arrival order of the ballots never changes the outcome', () => {
  const forwards = electionOf(['ada', 'bob', 'cy', 'di'], s1Ballots)
  const backwards = electionOf(['ada', 'bob', 'cy', 'di'], [...s1Ballots].reverse())
  assert.deepEqual(forwards.tally(), s1Result)
  assert.deepEqual(backwards.tally(), s1Result)
})

test('a ballot ranking only the eliminated candidate exhausts instead of transferring', () => {
  const election = electionOf(['ada', 'bob', 'cy', 'di'], [
    ballot('b1', 'ada', 'bob'), ballot('b2', 'ada', 'cy'), ballot('b3', 'ada', 'di'),
    ballot('b4', 'bob'),
    ballot('b5', 'cy'),
    ballot('b6', 'di'),
  ])
  assert.deepEqual(election.tally(), {
    winner: 'ada',
    rounds: [
      { round: 1, counts: { ada: 3, bob: 1, cy: 1, di: 1 }, continuing: 6, majority: 4, eliminated: ['bob'], winner: null },
      { round: 2, counts: { ada: 3, cy: 1, di: 1 }, continuing: 5, majority: 3, eliminated: [], winner: 'ada' },
    ],
  })
})
