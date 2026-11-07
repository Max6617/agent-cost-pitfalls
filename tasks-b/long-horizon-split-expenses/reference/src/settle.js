/**
 * Settlement suggestions: who should pay whom so the group ends up even, in
 * as few transfers as possible.
 *
 * The agreed procedure (docs/split-rules.md §4) works on net balances, not on
 * the individual debts: pair the member who owes the most with the member who
 * is owed the most, transfer the smaller of the two amounts, repeat on what
 * is left. Ties break by ascending member id. Working pairwise instead would
 * leave loops of debt standing that cancel to nothing.
 *
 * A suggestion is `{ from, to, cents }`: `from` hands `to` that many cents.
 */
import { replayBalances } from './balances.js'

export function suggestSettlements(events, memberIds) {
  const nets = replayBalances(events, memberIds)
  const balance = new Map(memberIds.map((id) => [id, nets[id] ?? 0]))

  const transfers = []
  for (;;) {
    const debtors = memberIds
      .filter((id) => balance.get(id) < 0)
      .sort((a, b) => balance.get(a) - balance.get(b) || (a < b ? -1 : a > b ? 1 : 0))
    const creditors = memberIds
      .filter((id) => balance.get(id) > 0)
      .sort((a, b) => balance.get(b) - balance.get(a) || (a < b ? -1 : a > b ? 1 : 0))
    if (debtors.length === 0 || creditors.length === 0) break

    const from = debtors[0]
    const to = creditors[0]
    const cents = Math.min(-balance.get(from), balance.get(to))
    transfers.push({ from, to, cents })
    balance.set(from, balance.get(from) + cents)
    balance.set(to, balance.get(to) - cents)
  }
  return transfers
}
