/**
 * Renewals.
 *
 * A renewal moves the due date out by one full loan period from the current
 * due date. Two refusals, checked in this order: the title has an active hold
 * ('held'); the loan has already been renewed the maximum number of times
 * ('renewal-limit').
 */
import { addDays } from './dates.js'

export function renewLoan({ loans, holds, catalog }, loanId) {
  const loan = loans.byId(loanId)
  if (!loan || loan.status !== 'open') return { ok: false, reason: 'loan-closed' }

  const held = holds.activeFor(loan.titleId).length > 0
  if (held) return { ok: false, reason: 'held' }

  if (loan.renewalsUsed >= catalog.policies.maxRenewals) return { ok: false, reason: 'renewal-limit' }

  const { loanDays } = catalog.policyFor(catalog.title(loan.titleId).category)
  loan.renewalsUsed += 1
  loan.dueAt = addDays(loan.dueAt, loanDays)
  return { ok: true, dueAt: loan.dueAt }
}
