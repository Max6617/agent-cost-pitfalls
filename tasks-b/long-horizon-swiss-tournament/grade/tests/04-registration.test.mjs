// Sub-problem 4: late entries. Half a point for each completed round missed,
// counted as byes, and invisible to Buchholz.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('a late entry sits at half a point and is drawn into the next round', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.register({ id: 'z', name: 'Zed', rating: 1950 })
  const r2 = t.pairRound()
  assert.equal(r2.bye, 'd') // z already counts as having sat out
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'a', black: 'c' },
    { board: 2, white: 'z', black: 'b' },
  ])
  t.report({ white: 'a', black: 'c', result: '1-0' })
  t.report({ white: 'z', black: 'b', result: '0-1' }) // z loses
  const z = t.standings().find((r) => r.id === 'z')
  assert.equal(z.score, 0.5)
  assert.equal(z.buchholz, 1) // b's score; the missed round contributes nothing
})

test('a player who misses two rounds is credited one point, once', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.pairRound() // a-c; b-d
  t.report({ white: 'a', black: 'c', result: '1-0' })
  t.report({ white: 'b', black: 'd', result: '1-0' })
  t.register({ id: 'z', name: 'Zed', rating: 1950 })
  const r3 = t.pairRound()
  assert.equal(r3.bye, 'd')
  assert.deepEqual(r3.pairings, [
    { board: 1, white: 'a', black: 'z' },
    { board: 2, white: 'b', black: 'c' },
  ])
  const z = t.standings().find((r) => r.id === 'z')
  assert.equal(z.score, 1)
  assert.equal(z.buchholz, 0) // z has not played a game yet
})

test('a late entry who wins still shows no Buchholz for the missed round', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.register({ id: 'z', name: 'Zed', rating: 1950 })
  const r2 = t.pairRound() // bye d; a-c; z-b
  t.report({ white: 'a', black: 'c', result: '1-0' })
  t.report({ white: 'z', black: 'b', result: '1-0' }) // z wins
  assert.deepEqual(
    t.standings().map((r) => [r.id, r.score, r.buchholz]),
    [['a', 2, 1], ['z', 1.5, 0], ['c', 1, 3], ['d', 1, 1], ['b', 0, 3.5]])
})

test('registration refuses duplicates and invalid entries, before and during play', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300]])
  assert.equal(t.register({ id: 'a', name: 'Again', rating: 1500 }).status, 'duplicate')
  assert.equal(t.register({ id: 'c', name: 'Cat', rating: 3.5 }).status, 'invalid')
  t.pairRound()
  t.report({ white: 'a', black: 'b', result: '1-0' })
  assert.equal(t.register({ id: 'a', name: 'Late Too', rating: 1500 }).status, 'duplicate')
  assert.equal(t.register({ id: 'z', name: 'Zed', rating: 1950 }).status, 'registered')
})
