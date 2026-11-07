const DAY_MS = 86400000

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year, month) {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return lengths[month - 1]
}

/** The instant at which the UTC day containing `ms` begins. */
export function startOfUTCDay(ms) {
  return Math.floor(ms / DAY_MS) * DAY_MS
}

/** The instant `days` UTC days after `ms`; used by the walk for its horizon. */
export function addUTCDays(ms, days) {
  return startOfUTCDay(ms) + days * DAY_MS
}

export const MS_PER_DAY = DAY_MS
