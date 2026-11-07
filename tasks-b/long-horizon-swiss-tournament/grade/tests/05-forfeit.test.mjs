// Sub-problem 5: forfeits. Scored as reported, invisible to Buchholz, still a
// pairing for the no-rematch rule, and two strikes withdraw a player.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('a forfeit scores normally but is invisible to Buchholz', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '0-1' }) // d wins
  const r2 = t.pairRound() // a-d; b-c
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'a', black: 'd' },
    { board: 2, white: 'b', black: 'c' },
  ])
  t.report({ white: 'a', black: 'd', result: '0-1', forfeit: true }) // a fails to appear
  t.report({ white: 'b', black: 'c', result: '1/2-1/2' })
  assert.deepEqual(
    t.standings().map((r) => [r.id, r.score, r.buchholz]),
    [['d', 2, 0.5], ['a', 1, 0.5], ['c', 0.5, 2.5], ['b', 0.5, 1.5]])
})

test('a forfeit and a bye in the same round both stay out of Buchholz', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000]])
  const ratingOf = { a: 2400, b: 2300, c: 2200, d: 2100, e: 2000 }
  const r1 = t.pairRound() // bye e; a-b; c-d
  for (const p of r1.pairings) {
    if (p.white === 'a' || p.black === 'a') {
      t.report({ white: p.white, black: p.black, result: '1-0', forfeit: true }) // b fails to appear
    } else {
      const winner = ratingOf[p.white] > ratingOf[p.black] ? p.white : p.black
      t.report({ white: p.white, black: p.black, result: winner === p.white ? '1-0' : '0-1' })
    }
  }
  const s = Object.fromEntries(t.standings().map((r) => [r.id, r]))
  assert.equal(s.a.buchholz, 0)
  assert.equal(s.b.buchholz, 0)
  assert.equal(s.b.forfeits, 1)
  assert.equal(s.c.buchholz, 0)
  assert.equal(s.d.buchholz, 1)
  assert.equal(s.e.buchholz, 0)
})

test('two forfeits withdraw a player from the draw but not from the table', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '0-1', forfeit: true }) // a fails to appear
  t.report({ white: 'c', black: 'd', result: '1-0' })
  const r2 = t.pairRound() // b-c; a-d
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'b', black: 'c' },
    { board: 2, white: 'a', black: 'd' },
  ])
  t.report({ white: 'b', black: 'c', result: '0-1' })
  t.report({ white: 'a', black: 'd', result: '0-1', forfeit: true }) // a fails to appear again
  const r3 = t.pairRound()
  assert.equal(r3.bye, 'd')
  assert.deepEqual(r3.pairings, [{ board: 1, white: 'c', black: 'b' }]) // the rematch nobody can avoid
  const a = t.players().find((p) => p.id === 'a')
  assert.equal(a.status, 'withdrawn')
  const row = t.standings().find((r) => r.id === 'a')
  assert.equal(row.status, 'withdrawn')
  assert.equal(row.score, 0)
})

test('a forfeited pairing still counts as having met when the draw comes round again', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  const r2 = t.pairRound() // a-c; b-d
  t.report({ white: 'a', black: 'c', result: '0-1', forfeit: true }) // a fails to appear
  t.report({ white: 'b', black: 'd', result: '1-0' })
  const r3 = t.pairRound()
  // a-b have met and a-c were drawn (forfeited or not), so a drops past both
  // of them to d while b and c play each other.
  assert.deepEqual(r3.pairings, [
    { board: 1, white: 'c', black: 'b' },
    { board: 2, white: 'a', black: 'd' },
  ])
  assert.equal(r3.bye, null)
  t.report({ white: 'c', black: 'b', result: '0-1' }) // b wins
  t.report({ white: 'a', black: 'd', result: '0-1' }) // d wins
  assert.deepEqual(
    t.standings().map((r) => [r.id, r.score, r.buchholz]),
    [['b', 2, 4], ['c', 2, 3], ['d', 1, 5], ['a', 1, 3]])
})
