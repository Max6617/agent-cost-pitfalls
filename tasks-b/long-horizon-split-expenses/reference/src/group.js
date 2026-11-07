/**
 * The group. The event log is the state: expenses and settlements are appended
 * to it, and everything else - balances, suggestions - is a view over it.
 * The running book (src/balances.js) is kept up to date as events land so that
 * balances() stays cheap; recompute() replays the log for the audit path.
 */
import { computeShares } from './split.js'
import { BalanceBook, replayBalances } from './balances.js'
import { suggestSettlements } from './settle.js'
import { checkExpense, checkSettlement } from './validate.js'

export class Group {
  constructor(id = 'group') {
    this.id = id
    this.roster = [] // everyone who ever joined, in join order
    this.active = new Set() // the current members
    this.log = []
    this.book = new BalanceBook()
    this.expenseIndex = new Map()
    this.seq = 0
  }

  addMember(id) {
    if (this.active.has(id)) return { status: 'duplicate-member' }
    this.active.add(id)
    this.roster.push(id)
    return { status: 'joined' }
  }

  /**
   * Add an expense. `among` defaults to every current member. Returns
   * `{ id, status }`; the id is the caller's, or an assigned `exp-N`.
   */
  addExpense(raw) {
    const among = raw.among ?? [...this.active]
    const id = raw.id ?? 'exp-' + (this.seq + 1)
    if (this.expenseIndex.has(id)) return { id, status: 'duplicate-id' }
    const err = checkExpense({ ...raw, among }, this.active)
    if (err) return { id, status: err }

    const shares = computeShares({ cents: raw.cents, split: raw.split, among })
    const event = {
      type: 'expense',
      id,
      paidBy: raw.paidBy,
      cents: raw.cents,
      split: raw.split,
      among: [...among],
      shares,
    }
    this.seq += 1
    this.log.push(event)
    this.expenseIndex.set(id, event)
    this.book.applyExpense(event)
    return { id, status: 'added' }
  }

  /** Record that `from` handed `to` `cents` in cash, outside the app. */
  recordSettlement(raw) {
    const err = checkSettlement(raw, this.active)
    if (err) return { status: err }
    const event = { type: 'settlement', from: raw.from, to: raw.to, cents: raw.cents }
    this.log.push(event)
    this.book.applySettlement(event)
    return { status: 'recorded' }
  }

  /**
   * Removal is a settlement event, not an erasure: it is refused while the
   * member's balance is not exactly zero, and a refusal changes nothing.
   * The balance is read off a full replay, never the running book.
   */
  removeMember(id) {
    if (!this.active.has(id)) return { status: 'unknown-member' }
    if ((this.recompute()[id] ?? 0) !== 0) return { status: 'unsettled-balance' }
    this.active.delete(id)
    this.book.remove(id)
    return { status: 'removed' }
  }

  /** The current members, in join order. */
  members() {
    return this.roster.filter((id) => this.active.has(id))
  }

  /** Running balances of the current members, in join order. */
  balances() {
    return this.book.snapshot(this.members())
  }

  balanceOf(id) {
    return this.active.has(id) ? (this.book.amounts.get(id) ?? 0) : null
  }

  expenseById(id) {
    const e = this.expenseIndex.get(id)
    if (!e) return null
    return {
      id: e.id,
      paidBy: e.paidBy,
      cents: e.cents,
      split: e.split,
      among: [...e.among],
      shares: { ...e.shares },
    }
  }

  /** Who should pay whom so the group ends up even. */
  suggestSettlements() {
    return suggestSettlements(this.log, this.members())
  }

  /** The log replayed from scratch: every member who ever joined. */
  recompute() {
    return replayBalances(this.log, this.roster)
  }

  /** A copy of the event log, oldest first. */
  events() {
    return this.log.map((e) => ({ ...e }))
  }
}

export function createGroup(id) {
  return new Group(id)
}
