/**
 * Running ledger.
 *
 * Charges and credits accumulate as exact amounts; only `balance()` rounds, and
 * the balance is what the customer sees on the statement.
 */
export class Ledger {
  constructor(opening = 0) {
    this.entries = []
    this.opening = opening
  }

  charge(amount, reference) {
    this.entries.push({ kind: 'charge', amount, reference })
    return this
  }

  credit(amount, reference) {
    this.entries.push({ kind: 'credit', amount, reference })
    return this
  }

  /** Exact sum of the entries plus the opening balance. */
  raw() {
    return this.entries.reduce((total, e) => total + (e.kind === 'credit' ? -e.amount : e.amount), this.opening)
  }

  /**
   * The statement balance.
   *
   * Rounded once at the end: rounding each entry first drifts by up to half a
   * cent per entry, which is what produced the Q3 credit notes.
   */
  balance(round) {
    return round(this.raw())
  }

  /** Entries in order, for the statement PDF. */
  statement() {
    return this.entries.map((e) => ({ ...e }))
  }
}
