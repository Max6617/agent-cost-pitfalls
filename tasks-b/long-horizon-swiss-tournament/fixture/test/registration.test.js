import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('a late entry is credited half a point for each completed round', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.register({ id: 'z', name: 'Zed', rating: 1950 })
  const z = t.standings().find((r) => r.id === 'z')
  assert.equal(z.score, 0.5)
  assert.equal(z.byes, 1)
})

test('a late entry is drawn into the next round and counts as having had a bye', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.register({ id: 'z', name: 'Zed', rating: 1950 })
  const r2 = t.pairRound()
  assert.equal(r2.bye, 'd') // z already has a bye to their name; d is lowest of the rest
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'a', black: 'c' },
    { board: 2, white: 'z', black: 'b' },
  ])
})

test('registration refuses a duplicate id and an invalid entry', () => {
  const t = createTournament()
  enter(t, [['a', 2400]])
  assert.equal(t.register({ id: 'a', name: 'Again', rating: 2000 }).status, 'duplicate')
  assert.equal(t.register({ id: 'b', name: '', rating: 2000 }).status, 'invalid')
  assert.equal(t.register({ id: 'c', name: 'Cat', rating: -5 }).status, 'invalid')
})
