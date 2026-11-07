// Sub-problem 3: the table. Score, Buchholz, the order of the tie-breaks, and
// the rule that the order results are entered in can never move a ranking.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTournament } from '../src/index.js'

const enter = (t, players) => players.forEach(([id, rating]) =>
  t.register({ id, name: id.toUpperCase(), rating }))

test('a three-round table with a bottom-board rematch and no ties anywhere', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900]])
  t.pairRound() // a-b; c-d; e-f
  t.report({ white: 'a', black: 'b', result: '1-0' })
  t.report({ white: 'c', black: 'd', result: '1-0' })
  t.report({ white: 'e', black: 'f', result: '1-0' })
  const r2 = t.pairRound() // a-c; b-d; e-f again, no alternative at the bottom
  t.report({ white: 'a', black: 'c', result: '0-1' })
  t.report({ white: 'b', black: 'd', result: '1-0' })
  t.report({ white: 'e', black: 'f', result: '1-0' })
  const r3 = t.pairRound() // c-e; a-d; b-f
  t.report({ white: 'c', black: 'e', result: '0-1' })
  t.report({ white: 'a', black: 'd', result: '1-0' })
  t.report({ white: 'b', black: 'f', result: '0-1' })
  assert.deepEqual(
    t.standings().map((r) => [r.id, r.score, r.buchholz]),
    [['e', 3, 4], ['c', 2, 5], ['a', 2, 3], ['f', 1, 7], ['b', 1, 3], ['d', 0, 5]])
})

test('a six-player table is the same whatever order the round is entered in', () => {
  const build = (order) => {
    const t = createTournament()
    enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900]])
    t.pairRound() // a-b; c-d; e-f
    const games = {
      ab: { white: 'a', black: 'b', result: '1-0' },
      cd: { white: 'c', black: 'd', result: '1-0' },
      ef: { white: 'e', black: 'f', result: '1-0' },
    }
    for (const key of order) t.report(games[key])
    return t.standings().map((r) => r.id)
  }
  assert.deepEqual(build(['ab', 'cd', 'ef']), ['a', 'c', 'e', 'b', 'd', 'f'])
  assert.deepEqual(build(['ef', 'cd', 'ab']), ['a', 'c', 'e', 'b', 'd', 'f'])
})

test('a bye and a forfeit still leave the table a pure function of the games', () => {
  const build = (order) => {
    const t = createTournament()
    enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000]])
    t.pairRound() // bye e; a-b; c-d
    const games = {
      ab: { white: 'a', black: 'b', result: '1-0' },
      cd: { white: 'c', black: 'd', result: '1-0', forfeit: true },
    }
    for (const key of order) t.report(games[key])
    return t.standings().map((r) => r.id)
  }
  assert.deepEqual(build(['ab', 'cd']), ['a', 'c', 'e', 'b', 'd'])
  assert.deepEqual(build(['cd', 'ab']), ['a', 'c', 'e', 'b', 'd'])
})

test('every Buchholz in a mixed round matches the opponents\' scores', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100], ['e', 2000], ['f', 1900], ['g', 1800]])
  const ratingOf = { a: 2400, b: 2300, c: 2200, d: 2100, e: 2000, f: 1900, g: 1800 }
  const r1 = t.pairRound() // bye g; a-b; c-d; e-f
  for (const p of r1.pairings) {
    if (p.white === 'c' || p.black === 'c') {
      t.report({ white: p.white, black: p.black, result: '1/2-1/2' })
    } else {
      const winner = ratingOf[p.white] > ratingOf[p.black] ? p.white : p.black
      t.report({ white: p.white, black: p.black, result: winner === p.white ? '1-0' : '0-1' })
    }
  }
  const s = Object.fromEntries(t.standings().map((r) => [r.id, r]))
  assert.equal(s.a.buchholz, 0)
  assert.equal(s.b.buchholz, 1)
  assert.equal(s.c.buchholz, 0.5)
  assert.equal(s.d.buchholz, 0.5)
  assert.equal(s.e.buchholz, 0)
  assert.equal(s.f.buchholz, 1)
  assert.equal(s.g.buchholz, 0)
})

test('a level table is broken by rating, not by whose result arrived first', () => {
  const t = createTournament()
  enter(t, [['a', 2400], ['b', 2300], ['c', 2200], ['d', 2100]])
  t.pairRound() // a-b; c-d
  t.report({ white: 'c', black: 'd', result: '1-0' }) // entered first on purpose
  t.report({ white: 'a', black: 'b', result: '1-0' })
  assert.deepEqual(t.standings().map((r) => r.id), ['a', 'c', 'b', 'd'])
})
