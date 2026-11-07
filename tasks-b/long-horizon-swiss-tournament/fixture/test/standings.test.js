import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

const tables = (t) => Object.fromEntries(t.standings().map((r) => [r.id, r]))

test('a bye contributes nothing to Buchholz', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000]])
  t.pairRound() // bye e; a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1/2-1/2' })
  const s = tables(t)
  assert.equal(s.a.buchholz, 0)
  assert.equal(s.b.buchholz, 1)
  assert.equal(s.c.buchholz, 0.5)
  assert.equal(s.d.buchholz, 0.5)
  assert.equal(s.e.buchholz, 0)
})

test('the table does not depend on the order results are entered', () => {
  const build = (order) => {
    const t = createTournament()
    enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
    t.pairRound() // a-b; c-d
    const games = {
      ab: { white: 'a', black: 'b', result: '1-0' },
      cd: { white: 'c', black: 'd', result: '1-0' },
    }
    for (const key of order) t.report(games[key])
    return t.standings().map((r) => r.id)
  }
  const forwards = build(['ab', 'cd'])
  const backwards = build(['cd', 'ab'])
  assert.deepEqual(forwards, ['a', 'c', 'b', 'd'])
  assert.deepEqual(backwards, forwards)
})

test('a forfeited game contributes nothing to either player\'s Buchholz', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '0-1' }) // b wins
  t.report({ white: 'c', black: 'd', result: '1-0' }) // c wins
  const r2 = t.pairRound() // b-c; a-d
  assert.deepEqual(r2.pairings, [
    { board: 1, white: 'b', black: 'c' },
    { board: 2, white: 'a', black: 'd' },
  ])
  t.report({ white: 'b', black: 'c', result: '0-1', forfeit: true }) // b fails to appear
  t.report({ white: 'a', black: 'd', result: '1/2-1/2' })
  const s = tables(t)
  assert.equal(s.c.buchholz, 0.5) // only d counts
  assert.equal(s.b.buchholz, 0.5) // only a counts
  assert.equal(s.a.buchholz, 1.5)
  assert.equal(s.d.buchholz, 2.5)
  assert.deepEqual(t.standings().map((r) => r.id), ['c', 'b', 'd', 'a'])
})

test('a two-round table with a floated player and no ties', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1/2-1/2' })
  t.pairRound() // a-c; d-b (d floated down)
  t.report({ white: 'a', black: 'c', result: '1-0' })
  t.report({ white: 'd', black: 'b', result: '0-1' })
  assert.deepEqual(
    t.standings().map((r) => [r.id, r.score, r.buchholz]),
    [['a', 2, 1.5], ['b', 1, 2.5], ['c', 0.5, 2.5], ['d', 0.5, 1.5]])
})
