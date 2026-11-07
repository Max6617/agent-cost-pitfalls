/**
 * Availability views over a room's busy intervals: which days are open, and
 * where the earliest open stretch of a given length begins.
 */

// a busy interval covers a day when the day sits between its first and
// last occupied night
const covers = (busy, day) => day >= busy.start && day <= busy.end

/**
 * The days of `window` on which nothing is busy, in ascending order.
 * `window` is an interval like any other.
 */
export function freeDays(busy, window) {
  const open = []
  for (let day = window.start; day < window.end; day++) {
    if (!busy.some((iv) => covers(iv, day))) open.push(day)
  }
  return open
}

/**
 * The first day of the earliest stretch of at least `nights` open days in
 * `window`, or null when no stretch is long enough.
 */
export function firstAvailable(busy, window, nights) {
  let runStart = null
  let run = 0
  for (let day = window.start; day < window.end; day++) {
    const taken = busy.some((iv) => iv.start <= day && day <= iv.end)
    if (taken) {
      runStart = null
      run = 0
      continue
    }
    if (runStart === null) runStart = day
    run += 1
    if (run >= nights) return runStart
  }
  return null
}
