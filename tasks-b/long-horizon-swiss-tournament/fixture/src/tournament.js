/**
 * The service itself: registration, round draws, result entry, and the table.
 * The flow is strict — a round is drawn, every game of it is reported, then
 * the next round is drawn — but the results of one round may be entered in
 * any order.
 */
import { LATE_ENTRY_POINTS, activePlayers, createRoster, registerPlayer } from './roster.js'
import { POINTS, alreadyPaired, createHistory, openGame, recordBye, recordPairings, recordResult } from './history.js'
import { byFieldOrder, pairField } from './pairing.js'
import { chooseBye } from './bye.js'
import { computeStandings } from './standings.js'
import { sorted } from './util/compare.js'

const WITHDRAW_AFTER = 2

export class Tournament {
  constructor() {
    this.roster = createRoster()
    this.history = createHistory()
    this.round = 0
    this.open = null
  }

  /** Rounds with every game reported; a drawn but unfinished round is not one. */
  completedRounds() {
    if (!this.open) return this.round
    const pending = this.open.pairings.some((p) =>
      openGame(this.history, this.open.round, p.white, p.black) === 'open')
    return pending ? this.round - 1 : this.round
  }

  /** Register a player. Late entries are credited for the rounds they missed. */
  register(raw) {
    const res = registerPlayer(this.roster, raw)
    if (res.status !== 'registered') return { status: res.status }
    for (let r = 1; r <= this.completedRounds(); r++) recordBye(this.history, r, res.player.id, LATE_ENTRY_POINTS)
    return { status: 'registered' }
  }

  scoreOf(id) {
    let total = 0
    for (const g of this.history.games) {
      if (g.white === id) total += g.pointsWhite
      else if (g.black === id) total += g.pointsBlack
    }
    return total
  }

  byeCountOf(id) {
    return this.history.games.filter((g) => g.kind === 'bye' && g.white === id).length
  }

  /** Draw the next round. Refuses while any game of the open round is unreported. */
  pairRound() {
    if (this.open) {
      const pending = this.open.pairings.filter((p) =>
        openGame(this.history, this.open.round, p.white, p.black) === 'open')
      if (pending.length) return { error: 'unreported-games', round: this.open.round }
    }
    const round = this.round + 1
    const field = sorted(
      activePlayers(this.roster).map((p) => ({ ...p, score: this.scoreOf(p.id) })),
      byFieldOrder)

    let pool = field
    let bye = null
    if (pool.length % 2 === 1) {
      bye = chooseBye(pool, (id) => this.byeCountOf(id))
      pool = pool.filter((p) => p.id !== bye.id)
      recordBye(this.history, round, bye.id, 1)
    }

    const { pairings, leftover } = pairField(pool, (a, b) => alreadyPaired(this.history, a, b))
    if (leftover) {
      bye = leftover
      recordBye(this.history, round, leftover.id, 1)
    }

    const rank = new Map(field.map((p, i) => [p.id, i]))
    const games = pairings.map(([a, b]) =>
      rank.get(a.id) <= rank.get(b.id) ? { white: a.id, black: b.id } : { white: b.id, black: a.id })
    games.sort((x, y) =>
      Math.min(rank.get(x.white), rank.get(x.black)) - Math.min(rank.get(y.white), rank.get(y.black)))
    const pairingsOut = games.map((g, i) => ({ board: i + 1, white: g.white, black: g.black }))

    recordPairings(this.history, round, pairingsOut)
    this.round = round
    this.open = { round, pairings: pairingsOut }
    return { round, pairings: pairingsOut, bye: bye ? bye.id : null }
  }

  /** Enter the result of a game of the open round, colours as drawn. */
  report(raw) {
    if (!this.open) return { status: 'no-open-round' }
    const white = this.roster.players.get(raw?.white)
    const black = this.roster.players.get(raw?.black)
    if (!white || !black) return { status: 'unknown-player' }
    if (!Object.hasOwn(POINTS, raw.result)) return { status: 'invalid' }
    if (raw.forfeit && raw.result === '1/2-1/2') return { status: 'invalid' }
    const state = openGame(this.history, this.open.round, raw.white, raw.black)
    if (!state) return { status: 'not-paired' }
    if (state === 'reported') return { status: 'already-reported' }
    const { forfeiter } = recordResult(this.history, {
      round: this.open.round, white: raw.white, black: raw.black, result: raw.result, forfeit: !!raw.forfeit,
    })
    if (forfeiter) {
      const p = this.roster.players.get(forfeiter)
      p.strikes += 1
      if (p.strikes >= WITHDRAW_AFTER) p.status = 'withdrawn'
    }
    return { status: 'recorded' }
  }

  /** The table, withdrawn players included. */
  standings() {
    return computeStandings([...this.roster.players.values()], this.history.games)
  }

  players() {
    return [...this.roster.players.values()].map((p) =>
      ({ id: p.id, name: p.name, rating: p.rating, status: p.status }))
  }
}
