import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('the lowest-ranked player sits out when the field is odd', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000]])
  const r1 = t.pairRound()
  assert.equal(r1.bye, 'e')
  assert.deepEqual(r1.pairings, [
    { board: 1, white: 'a', black: 'b' },
    { board: 2, white: 'c', black: 'd' },
  ])
})

test('the first draw pairs the field in rating order', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900]])
  const r1 = t.pairRound()
  assert.equal(r1.bye, null)
  assert.deepEqual(r1.pairings, [
    { board: 1, white: 'a', black: 'b' },
    { board: 2, white: 'c', black: 'd' },
    { board: 3, white: 'e', black: 'f' },
  ])
})

test('a player left over in an odd score group does not replay the opponent they just met', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound()
  t.report({ white: 'a', black: 'b', result: '1/2-1/2' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  const r2 = t.pairRound()
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'c', black: 'a' },
    { board: 2, white: 'b', black: 'd' },
  ])
  assert.equal(r2.bye, null)
})
