/**
 * The per-key daily allowance window.
 *
 * A key's usage on one day may exceed its allowance only by borrowing against
 * the next day, up to the borrow cap; the borrowed amount is the debt the
 * next day owes back (docs/quota-rules.md section 6). The window is a set of
 * counters for the current day plus the debt outstanding against it.
 */
export class DailyWindow {
  constructor({ limit, borrowLimit }) {
    this.limit = limit
    this.borrowLimit = borrowLimit
    this.day = null
    this.used = 0
    this.owed = 0
    this.borrowed = 0
  }

  /** Roll the window forward so that `day` is the current day. */
  advanceTo(day) {
    if (this.day === null) {
      this.day = day
      return
    }
    while (this.day < day) this.rollover()
  }

  rollover() {
    // Collect the debt at the boundary: what was borrowed yesterday is
    // charged against today. A day that collects it discharges it, so the
    // rollover after this one owes nothing.
    this.day += 1
    this.owed = this.borrowed
    this.borrowed = 0
    this.used = 0
  }

  /** What a request may still spend today without borrowing. */
  remaining() {
    return this.limit - this.owed - this.used + this.borrowed
  }

  /** How much more the key may still borrow against tomorrow. */
  borrowHeadroom() {
    return this.borrowLimit - this.borrowed
  }

  /**
   * Would a request for `cost` units be admitted by the daily window?
   * Answers without touching the counters; `commit` applies the decision.
   */
  check(cost) {
    const remaining = this.remaining()
    if (remaining >= cost) return { ok: true }
    const shortfall = cost - remaining
    if (shortfall <= this.borrowHeadroom()) return { ok: true, borrow: shortfall }
    return { ok: false }
  }

  /** Apply a decision `check` has already made. */
  commit(cost) {
    const decision = this.check(cost)
    if (decision.borrow) this.borrowed += decision.borrow
    this.used += cost
  }
}
