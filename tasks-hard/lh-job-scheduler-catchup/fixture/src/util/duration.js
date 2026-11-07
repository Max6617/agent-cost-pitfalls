/**
 * Operators write windows as durations: "90s", "1h30m", "2d".
 */

const UNITS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }
const PART = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/g

export function parseDuration(text) {
  if (typeof text !== 'string') throw new TypeError('a duration reads like "90s" or "1h30m"')
  const trimmed = text.trim()
  if (!trimmed) throw new RangeError('empty duration')
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  let total = 0
  let matched = false
  for (const part of trimmed.matchAll(PART)) {
    total += Number(part[1]) * UNITS[part[2]]
    matched = true
  }
  if (!matched) throw new RangeError('not a duration: ' + JSON.stringify(text))
  return Math.round(total)
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0))
  if (total < 1000) return total + 'ms'
  const parts = []
  let rest = total
  for (const [unit, size] of [['d', UNITS.d], ['h', UNITS.h], ['m', UNITS.m], ['s', UNITS.s]]) {
    const whole = Math.floor(rest / size)
    if (whole) parts.push(whole + unit)
    rest -= whole * size
  }
  return parts.join('')
}
