// Sub-problem 2: the bye. Lowest-ranked of those with the fewest byes, one
// point, and what it does to the table.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('the bye goes to the bottom of the field in round one', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900], ['g', 1800]])
  const r1 = t.pairRound()
  assert.equal(r1.bye, 'g')
  assert.deepEqual(r1.pairings, [
    { board: 1, white: 'a', black: 'b' },
    { board: 2, white: 'c', black: 'd' },
    { board: 3, white: 'e', black: 'f' },
  ])
})

test('a player who already sat out is passed over for the next bye', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000]])
  const r1 = t.pairRound()
  assert.equal(r1.bye, 'e')
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  const r2 = t.pairRound()
  // e already has a bye; d is the lowest-ranked player who has none.
  assert.equal(r2.bye, 'd')
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'a', black: 'c' },
    { board: 2, white: 'e', black: 'b' },
  ])
})

test('the bye walks down the field round after round', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200]])
  const r1 = t.pairRound()
  assert.equal(r1.bye, 'c')
  t.report({ white: 'a', black: 'b', result: '1-0' })
  const r2 = t.pairRound()
  assert.equal(r2.bye, 'b')
  t.report({ white: 'a', black: 'c', result: '1-0' })
  const r3 = t.pairRound()
  assert.equal(r3.bye, 'a')
  assert.deepEqual(r3.pairings, [{ board: 1, white: 'b', black: 'c' }])
})

test('a bye scores a point but adds nothing to Buchholz', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000]])
  const ratingOf = { a: 2400, b: 2300, c: 2200, d: 2100, e: 2000 }
  const r1 = t.pairRound() // bye e; a-b; c-d
  for (const p of r1.pairings) {
    const winner = ratingOf[p.white] > ratingOf[p.black] ? p.black : p.white // an upset on every board
    t.report({ white: p.white, black: p.black, result: winner === p.white ? '1-0' : '0-1' })
  }
  const r2 = t.pairRound() // bye c; b-d; e-a
  assert.equal(r2.bye, 'c')
  for (const p of r2.pairings) t.report({ white: p.white, black: p.black, result: '1/2-1/2' })
  assert.deepEqual(
    t.standings().map((r) => [r.id, r.score, r.buchholz]),
    [['d', 1.5, 2.5], ['b', 1.5, 2], ['e', 1.5, 0.5], ['c', 1, 1.5], ['a', 0.5, 3]])
})
