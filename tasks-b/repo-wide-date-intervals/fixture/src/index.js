/**
 * Public surface.
 *
 * Everything a caller is allowed to import. Modules under src/ that are not
 * re-exported here are internal and may be reorganised freely; the names
 * below may not.
 *
 * Days are integer day numbers everywhere, and an interval is always
 * `{ start, end }`; docs/interval-convention.md says which days that covers.
 */
export * as intervals from './intervals.js'
export { createBookingCalendar } from './bookings.js'
export { freeDays, firstAvailable } from './availability.js'
export { trialEnd, trialStatus } from './trials.js'
export { billableDays, prorate } from './billing.js'
export { busyPeriods, occupancyReport, busiestDay } from './reports.js'
export { effectiveWindow, planNights } from './campaigns.js'
