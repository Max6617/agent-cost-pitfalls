/**
 * Calendar arithmetic.
 *
 * Everything here works on plain numbers: a civil date is turned into a day
 * count and back, and a wall clock is turned into "the instant you would get if
 * that reading were UTC". No Date, no locale, no ambient timezone - the same
 * numbers on every host.
 */

export const MS_PER_SECOND = 1000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Days since 1970-01-01 for a proleptic Gregorian date. */
export function daysFromCivil(year, month, day) {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

/** The inverse of daysFromCivil. */
export function civilFromDays(days) {
  const z = days + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp + (mp < 10 ? 3 : -9)
  return { year: month <= 2 ? y + 1 : y, month, day }
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31
}

/** A wall clock read as if it were UTC. */
export function epochFromParts(parts) {
  return daysFromCivil(parts.year, parts.month, parts.day) * MS_PER_DAY
    + parts.hour * MS_PER_HOUR
    + parts.minute * MS_PER_MINUTE
    + parts.second * MS_PER_SECOND
}

/** The inverse of epochFromParts: calendar fields, no offset applied. */
export function partsFromEpoch(ms) {
  const days = Math.floor(ms / MS_PER_DAY)
  let rest = ms - days * MS_PER_DAY
  const date = civilFromDays(days)
  const hour = Math.floor(rest / MS_PER_HOUR)
  rest -= hour * MS_PER_HOUR
  const minute = Math.floor(rest / MS_PER_MINUTE)
  rest -= minute * MS_PER_MINUTE
  const second = Math.floor(rest / MS_PER_SECOND)
  return { year: date.year, month: date.month, day: date.day, hour, minute, second }
}

/** Accepts the string and the object form of a local reading. */
export function normaliseLocal(input) {
  if (typeof input === 'string') {
    const m = LOCAL_PATTERN.exec(input)
    if (!m) throw new TypeError('local reading must look like YYYY-MM-DDTHH:MM(:SS): ' + input)
    return {
      year: Number(m[1]), month: Number(m[2]), day: Number(m[3]),
      hour: Number(m[4]), minute: Number(m[5]), second: m[6] ? Number(m[6]) : 0,
    }
  }
  if (input && typeof input === 'object') {
    return {
      year: Number(input.year), month: Number(input.month), day: Number(input.day),
      hour: Number(input.hour ?? 0), minute: Number(input.minute ?? 0), second: Number(input.second ?? 0),
    }
  }
  throw new TypeError('local reading must be a string or an object')
}

export function pad(value, width = 2) {
  return String(value).padStart(width, '0')
}

/** `2024-03-10T02:30:00` */
export function formatLocal(parts) {
  return pad(parts.year, 4) + '-' + pad(parts.month) + '-' + pad(parts.day)
    + 'T' + pad(parts.hour) + ':' + pad(parts.minute) + ':' + pad(parts.second)
}
