/**
 * Loans: checkout, return, and loss reporting.
 *
 * A loan ties one copy to one member. It is open from checkout until the copy
 * comes back or is written off as lost; every operation takes the date it
 * happens on - the service never reads a clock.
 */
import { addDays, diffDays } from './dates.js'
import { assessOverdueFine, isWithinGrace } from './fines.js'

export class Loans {
  constructor({ catalog, members, holds }) {
    this.catalog = catalog
    this.members = members
    this.holds = holds
    this.loans = new Map()
    this.chargesByMember = new Map()
    this.nextId = 1
  }

  byId(loanId) {
    return this.loans.get(loanId) ?? null
  }

  checkout(copyId, memberId, date) {
    const copy = this.catalog.copy(copyId)
    if (!copy) return { ok: false, reason: 'unknown-copy' }
    if (!this.members.get(memberId)) return { ok: false, reason: 'unknown-member' }
    if (copy.status === 'out' || copy.status === 'lost') return { ok: false, reason: 'unavailable' }
    if (copy.status === 'awaiting-pickup') {
      const hold = this.holds.byId(copy.holdId)
      if (!hold || hold.memberId !== memberId) return { ok: false, reason: 'held-for-other' }
      hold.status = 'fulfilled'
      copy.holdId = null
    }
    const title = this.catalog.title(copy.titleId)
    const { loanDays } = this.catalog.policyFor(title.category)
    const loan = {
      id: `L-${this.nextId++}`,
      copyId,
      titleId: copy.titleId,
      memberId,
      checkedOutAt: date,
      dueAt: addDays(date, loanDays),
      renewalsUsed: 0,
      status: 'open',
      returnedAt: null,
    }
    this.loans.set(loan.id, loan)
    copy.status = 'out'
    return { ok: true, loanId: loan.id, dueAt: loan.dueAt }
  }

  returnCopy(loanId, date) {
    const loan = this.byId(loanId)
    if (!loan || loan.status !== 'open') return { ok: false, reason: 'loan-closed' }
    const title = this.catalog.title(loan.titleId)
    const billCents = assessOverdueFine(
      this.catalog.policyFor(title.category),
      this.catalog.policies.graceDays,
      loan.dueAt,
      date,
    )
    const daysLate = Math.max(0, diffDays(loan.dueAt, date))
    loan.status = 'returned'
    loan.returnedAt = date
    if (billCents > 0) this.addCharge(loan.memberId, { loanId, kind: 'overdue', amountCents: billCents, date })

    const copy = this.catalog.copy(loan.copyId)
    copy.status = 'available'
    const next = this.holds.queue(loan.titleId).find((h) => h.status === 'waiting')
    if (next) {
      next.status = 'ready'
      copy.status = 'awaiting-pickup'
      copy.holdId = next.id
    }
    return { ok: true, billCents, daysLate }
  }

  reportLost(loanId, date) {
    const loan = this.byId(loanId)
    if (!loan || loan.status !== 'open') return { ok: false, reason: 'loan-closed' }
    const billCents = isWithinGrace(loan.dueAt, date, this.catalog.policies.graceDays)
      ? 0
      : this.catalog.replacementCostCents(loan.titleId)
    loan.status = 'lost'
    this.catalog.copy(loan.copyId).status = 'lost'
    if (billCents > 0) this.addCharge(loan.memberId, { loanId, kind: 'lost', amountCents: billCents, date })
    return { ok: true, billCents }
  }

  addCharge(memberId, charge) {
    if (!this.chargesByMember.has(memberId)) this.chargesByMember.set(memberId, [])
    this.chargesByMember.get(memberId).push(charge)
  }

  charges(memberId) {
    return [...(this.chargesByMember.get(memberId) ?? [])]
  }

  balance(memberId) {
    return this.charges(memberId).reduce((sum, c) => sum + c.amountCents, 0)
  }
}
