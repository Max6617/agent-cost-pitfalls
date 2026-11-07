/**
 * Overdue fines.
 *
 * A return inside the grace window owes nothing. Past the window the fine is
 * the per-day rate for the category times the number of days late, capped per
 * loan. Amounts are integer cents; docs/loan-rules.md fixes the numbers.
 */
import { diffDays } from './dates.js'

/** Whether a return on `date` falls inside the grace window after `dueAt`. */
export function isWithinGrace(dueAt, date, graceDays) {
  return diffDays(dueAt, date) <= graceDays
}

/** The fine in cents for returning on `returnDate` a loan due on `dueAt`. */
export function assessOverdueFine(policy, graceDays, dueAt, returnDate) {
  if (isWithinGrace(dueAt, returnDate, graceDays)) return 0
  const daysLate = diffDays(dueAt, returnDate) + 1
  return Math.min(daysLate * policy.finePerDayCents, policy.fineCapCents)
}
