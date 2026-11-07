/**
 * Durations in deployment profiles.
 *
 * Profiles are written by hand and read by operators, so a duration is written
 * the way the calendar and clock notation says: `PT30S`, `PT5M`, `P1DT12H`,
 * `P2W`. The notation is a published standard and the parser follows it rather
 * than inventing a friendlier dialect — profiles get copied between tools and a
 * dialect that only we understand is a dialect nobody else can read.
 *
 * The two things worth getting right, and the two that are easy to get wrong:
 *
 *   - a component may be fractional, and the fraction applies to the component
 *     it is attached to, so `PT1.5H` is ninety minutes and not one hour
 *   - the date part and the time part are separated by a `T`, and a duration
 *     with no `T` has no time components even if it looks like it might
 */

/** Seconds in each unit the notation allows. */
const UNIT_SECONDS = {
  W: 7 * 24 * 3600,
  D: 24 * 3600,
  H: 3600,
  M: 60,
  S: 1,
}

const DATE_UNITS = new Set(['Y', 'M', 'W', 'D'])
const TIME_UNITS = new Set(['H', 'M', 'S'])

/** Which unit a component belongs to, given whether `T` has been seen. */
function secondsFor(unit, inTime) {
  if (unit === 'Y') return 365 * 24 * 3600
  return UNIT_SECONDS[unit] ?? null
}

/**
 * Parse a duration into milliseconds.
 *
 * @param {string} text
 * @returns {number|null} null when the text is not a duration
 */
export function parseDuration(text) {
  const source = String(text ?? '').trim()
  if (!source.startsWith('P')) return null

  const body = source.slice(1)
  if (body === '') return null

  const segments = body.split('T')
  if (segments.length > 2) return null
  const [datePart, timePart] = segments
  const inTime = segments.length === 2
  if (inTime && timePart === '') return null

  const scan = (part, time) => {
    if (part === '') return 0
    let total = 0
    let seen = 0
    const pattern = /(\d+)([A-Z])/g
    let match
    let consumed = 0
    while ((match = pattern.exec(part)) !== null) {
      const value = Number(match[1])
      const unit = match[2]
      const size = secondsFor(unit, time)
      if (size === null) return null
      total += value * size
      seen += 1
      consumed += match[0].length
    }
    if (!seen) return null
    return total
  }

  const dateSeconds = scan(datePart, false)
  if (dateSeconds === null) return null
  const timeSeconds = inTime ? scan(timePart, true) : 0
  if (timeSeconds === null) return null

  return Math.round((dateSeconds + timeSeconds) * 1000)
}

/** Format milliseconds back into the notation, largest unit first. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null
  let seconds = Math.round(ms / 1000)
  if (seconds === 0) return 'PT0S'

  const days = Math.floor(seconds / 86400)
  seconds -= days * 86400
  const hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600
  const minutes = Math.floor(seconds / 60)
  seconds -= minutes * 60

  let out = 'P'
  if (days) out += days + 'D'
  const time = (hours ? hours + 'H' : '') + (minutes ? minutes + 'M' : '') + (seconds ? seconds + 'S' : '')
  return time ? out + 'T' + time : out
}

/** Parse, or throw with the offending text. */
export function mustParseDuration(text) {
  const value = parseDuration(text)
  if (value === null) throw new Error('not a duration: ' + text)
  return value
}

/** Parse a profile's duration fields, leaving the rest alone. */
export function parseProfile(profile) {
  const out = { ...profile }
  const converted = {}
  for (const key of ['timeout', 'interval', 'grace']) {
    if (out[key] === undefined) continue
    converted[key + 'Ms'] = mustParseDuration(out[key])
  }
  return { ...out, ...converted }
}
