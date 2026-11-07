/**
 * Occupancy reporting over a room's busy intervals. Busy intervals that
 * overlap or run straight into each other are one busy period: a room that
 * is checked out of on day 8 and checked into on day 8 has no free day in
 * between.
 */
import { merge } from './intervals.js'
import { byStartThenEnd } from './util/sort.js'

/** The busy intervals merged into maximal busy periods, earliest first. */
export function busyPeriods(busy) {
  const sorted = busy.slice().sort(byStartThenEnd)
  const periods = []
  for (const iv of sorted) {
    const last = periods[periods.length - 1]
    const combined = last ? merge(last, iv) : null
    if (combined) periods[periods.length - 1] = combined
    else periods.push({ start: iv.start, end: iv.end })
  }
  return periods
}

/**
 * The picture over a reporting window: the busy periods (clipped to the
 * window), how many of the window's days are busy, and the longest stretch.
 */
export function occupancyReport(busy, window) {
  const periods = busyPeriods(busy)
    .map((p) => ({ start: Math.max(p.start, window.start), end: Math.min(p.end, window.end) }))
    .filter((p) => p.start < p.end)
  const occupiedDays = periods.reduce((days, p) => days + (p.end - p.start), 0)
  const longestPeriod = periods.reduce((best, p) => Math.max(best, p.end - p.start), 0)
  return { periods, occupiedDays, longestPeriod }
}

/**
 * The day in `window` with the most busy intervals over it (the earliest
 * such day on a tie), or null when every day of the window is free.
 */
export function busiestDay(busy, window) {
  let bestDay = null
  let bestCount = 0
  for (let day = window.start; day < window.end; day++) {
    const count = busy.filter((iv) => iv.start <= day && day <= iv.end).length
    if (count > bestCount) {
      bestDay = day
      bestCount = count
    }
  }
  return bestDay
}
