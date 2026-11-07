// Sub-problem 1: the draw. Score groups matched from the top, no rematches,
// floats down through the groups, and what happens at the bottom.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('a level pair who meet again inside an odd group are kept apart over three rounds', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['c', 2300], ['b', 2200], ['d', 2100], ['e', 2000], ['f', 1900], ['g', 1800], ['h', 1700]])
  const r1 = t.pairRound()
  assert.deepEqual(r1.pairings, [
    { board: 1, white: 'a', black: 'c' },
    { board: 2, white: 'b', black: 'd' },
    { board: 3, white: 'e', black: 'f' },
    { board: 4, white: 'g', black: 'h' },
  ])
  for (const p of r1.pairings) t.report({ white: p.white, black: p.black, result: '1-0' })
  const r2 = t.pairRound()
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'a', black: 'b' },
    { board: 2, white: 'e', black: 'g' },
    { board: 3, white: 'c', black: 'd' },
    { board: 4, white: 'f', black: 'h' },
  ])
  t.report({ white: 'a', black: 'b', result: '1/2-1/2' }) // a and b share a group later
  t.report({ white: 'e', black: 'g', result: '0-1' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.report({ white: 'f', black: 'h', result: '1-0' })
  const r3 = t.pairRound()
  // g is alone on 2 and floats; a-b have met, so a takes the floater and b
  // drops; e-f have met, so e and f drop past one another to the bottom group.
  assert.deepEqual(r3.pairings, [
    { board: 1, white: 'g', black: 'a' },
    { board: 2, white: 'b', black: 'c' },
    { board: 3, white: 'e', black: 'd' },
    { board: 4, white: 'f', black: 'h' },
  ])
  assert.equal(r3.bye, null)
})

test('two drawn pairs cross over rather than replay', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900]])
  t.pairRound()
  t.report({ white: 'a', black: 'b', result: '1/2-1/2' })
  t.report({ white: 'c', black: 'd', result: '1/2-1/2' })
  t.report({ white: 'e', black: 'f', result: '1-0' })
  const r2 = t.pairRound()
  // e is alone on 1 point and floats into the four on a half; a-b and c-d have
  // met, so the group crosses; e is left for f at the bottom, a rematch no
  // other pairing can avoid.
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'e', black: 'f' },
    { board: 2, white: 'a', black: 'c' },
    { board: 3, white: 'b', black: 'd' },
  ])
  assert.equal(r2.bye, null)
})

test('a floater is matched inside the lower group, not replayed against their last opponent', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900], ['g', 1800], ['h', 1700]])
  t.pairRound()
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '0-1' }) // d wins
  t.report({ white: 'e', black: 'f', result: '1/2-1/2' })
  t.report({ white: 'g', black: 'h', result: '1-0' })
  const r2 = t.pairRound()
  // g floats out of the leading group; e-f have met, so e takes the floater
  // and f drops to the bottom group instead.
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'a', black: 'd' },
    { board: 2, white: 'g', black: 'e' },
    { board: 3, white: 'f', black: 'h' },
    { board: 4, white: 'b', black: 'c' },
  ])
  assert.equal(r2.bye, null)
})

test('a rematch inside an even group pushes both players down before it is made', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900]])
  t.pairRound()
  t.report({ white: 'a', black: 'b', result: '1/2-1/2' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.report({ white: 'e', black: 'f', result: '1-0' })
  const r2 = t.pairRound()
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'c', black: 'e' },
    { board: 2, white: 'a', black: 'd' },
    { board: 3, white: 'b', black: 'f' },
  ])
  assert.equal(r2.bye, null)
})

test('three drawn pairs and a leader sort themselves out without a single rematch', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900], ['g', 1800], ['h', 1700]])
  t.pairRound()
  t.report({ white: 'a', black: 'b', result: '1/2-1/2' })
  t.report({ white: 'c', black: 'd', result: '1/2-1/2' })
  t.report({ white: 'e', black: 'f', result: '1/2-1/2' })
  t.report({ white: 'g', black: 'h', result: '1-0' })
  const r2 = t.pairRound()
  // g leads alone and floats into the half-point group; every drawn pair
  // crosses, the floater finds an unmet opponent in e, and f drops to h.
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'g', black: 'e' },
    { board: 2, white: 'a', black: 'c' },
    { board: 3, white: 'b', black: 'd' },
    { board: 4, white: 'f', black: 'h' },
  ])
  assert.equal(r2.bye, null)
})
