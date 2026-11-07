/**
 * Balances. A member's balance is a signed number of cents: positive means the
 * group owes them, negative means they owe the group. The balances of the
 * current members always add up to zero - the book foots.
 *
 * There are two ways to read them, kept in lockstep:
 *
 *   BalanceBook      the running totals, updated as each event happens; this is
 *                    what balances() answers from, because it is the hot path
 *   replayBalances   a from-scratch replay of the event log; the audit path,
 *                    exposed as recompute()
 */
export class BalanceBook {
  constructor() {
    this.amounts = new Map()
  }

  credit(id, cents) {
    this.amounts.set(id, (this.amounts.get(id) ?? 0) + cents)
  }

  /** The payer fronts the money; every participant's share comes back out. */
  applyExpense(expense) {
    this.credit(expense.paidBy, expense.cents)
    for (const [id, share] of Object.entries(expense.shares)) this.credit(id, -share)
  }

  /** Handing cash over improves the payer's position: from rises, to falls. */
  applySettlement({ from, to, cents }) {
    this.credit(from, cents)
    this.credit(to, -cents)
  }

  remove(id) {
    this.amounts.delete(id)
  }

  /** The balances of the given members, in the order given. */
  snapshot(ids) {
    return Object.fromEntries(ids.map((id) => [id, this.amounts.get(id) ?? 0]))
  }
}

/**
 * Replay the whole log from scratch. Includes every id in `ids` (the full
 * roster, including members who have since left), even when no event touches
 * them.
 */
export function replayBalances(events, ids) {
  const amounts = new Map(ids.map((id) => [id, 0]))
  const credit = (id, cents) => amounts.set(id, (amounts.get(id) ?? 0) + cents)
  for (const e of events) {
    if (e.type === 'expense') {
      credit(e.paidBy, e.cents)
      for (const [id, share] of Object.entries(e.shares)) credit(id, -share)
    } else if (e.type === 'settlement') {
      credit(e.from, e.cents)
      credit(e.to, -e.cents)
    }
  }
  return Object.fromEntries(amounts)
}
