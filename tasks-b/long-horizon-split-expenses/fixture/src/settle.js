/**
 * Settlement suggestions: who should pay whom so the group ends up even.
 *
 * The suggestions are derived from the event log (not from the running book,
 * which is a reporting view). Debts are collected person-to-person, debts that
 * run both ways between the same two people cancel against each other, and
 * whatever is left is the suggestion list.
 *
 * A suggestion is `{ from, to, cents }`: `from` hands `to` that many cents.
 */
export function suggestSettlements(events, memberIds) {
  const debts = new Map() // 'debtor>creditor' -> cents owed

  const owe = (debtor, creditor, cents) => {
    if (debtor === creditor || cents <= 0) return
    const key = debtor + '>' + creditor
    debts.set(key, (debts.get(key) ?? 0) + cents)
  }

  for (const e of events) {
    if (e.type === 'expense') {
      for (const [id, share] of Object.entries(e.shares)) {
        if (id !== e.paidBy) owe(id, e.paidBy, share)
      }
    } else if (e.type === 'settlement') {
      // the payment reverses the debt it settles
      owe(e.to, e.from, e.cents)
    }
  }

  // cancel debts that run both ways between the same two people
  for (const [key, cents] of [...debts]) {
    const [a, b] = key.split('>')
    const back = b + '>' + a
    if (!debts.has(back)) continue
    const other = debts.get(back)
    if (cents > other) {
      debts.set(key, cents - other)
      debts.delete(back)
    } else if (cents < other) {
      debts.set(back, other - cents)
      debts.delete(key)
    } else {
      debts.delete(key)
      debts.delete(back)
    }
  }

  const current = new Set(memberIds)
  return [...debts.entries()]
    .map(([key, cents]) => {
      const [from, to] = key.split('>')
      return { from, to, cents }
    })
    .filter((t) => current.has(t.from) && current.has(t.to))
    .sort((x, y) => (x.from < y.from ? -1 : x.from > y.from ? 1 : x.to < y.to ? -1 : x.to > y.to ? 1 : 0))
}
