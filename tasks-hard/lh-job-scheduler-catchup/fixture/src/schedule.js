/**
 * Schedules.
 *
 * A schedule is a plain description of the instants a job runs at; it is not a
 * timer and it holds no state. `instantsBetween` answers for the window it is
 * given: ascending, whole milliseconds, no repeats.
 */
import { DAY, pad2, parseInstant, startOfUtcDay, toIso } from './time.js'
import { localToEpoch } from './offsets.js'

export const KINDS = ['interval', 'local-daily', 'cron']

/** A guard against a schedule that would enumerate half of eternity. */
const MAX_INSTANTS = 20000
const AT_TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/

export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') throw new TypeError('a job needs a schedule')
  if (!KINDS.includes(schedule.kind)) {
    throw new RangeError('unknown schedule kind ' + JSON.stringify(schedule.kind))
  }
  if (schedule.kind === 'interval') {
    const every = Number(schedule.everyMs)
    if (!Number.isFinite(every) || every < 1) throw new RangeError('an interval schedule needs everyMs >= 1')
    parseInstant(schedule.anchor, 'anchor')
  }
  if (schedule.kind === 'local-daily') {
    if (typeof schedule.zone !== 'string' || !schedule.zone) {
      throw new TypeError('a local-daily schedule needs a zone')
    }
    if (typeof schedule.at !== 'string' || !AT_TIME.test(schedule.at)) {
      throw new RangeError('a local-daily schedule needs at: "HH:MM"')
    }
  }
  if (schedule.kind === 'cron') {
    hoursOf(schedule.hour)
    minutesOf(schedule.minute)
  }
  return schedule
}

/**
 * The scheduled instants inside the half-open window `(after, until]`.
 *
 * `offsets` is only consulted by the wall-clock kinds.
 */
export function instantsBetween(schedule, after, until, offsets) {
  const from = parseInstant(after, 'after')
  const to = parseInstant(until, 'until')
  if (to < from) return []
  const found = schedule.kind === 'interval'
    ? intervalInstants(schedule, from, to)
    : wallClockInstants(schedule, from, to, offsets)
  const inside = found.filter((at) => at > from && at <= to).sort((a, b) => a - b)
  const out = []
  for (const at of inside) {
    if (out[out.length - 1] !== at) out.push(at)
    if (out.length >= MAX_INSTANTS) break
  }
  return out
}

function intervalInstants(schedule, from, to) {
  const every = Math.trunc(Number(schedule.everyMs))
  const anchor = parseInstant(schedule.anchor, 'anchor')
  let k = Math.floor((from - anchor) / every) + 1
  if (k < 0) k = 0
  const out = []
  for (let at = anchor + k * every; at <= to && out.length < MAX_INSTANTS; at += every) {
    out.push(at)
  }
  return out
}

function wallClockInstants(schedule, from, to, offsets) {
  const zone = schedule.zone ?? 'UTC'
  const times = schedule.kind === 'local-daily' ? [parseAt(schedule.at)] : cronTimes(schedule)
  const out = []
  // A local day can start on the previous UTC day, so the sweep is widened by
  // one day at each end; the window filter above throws the extras away.
  for (let day = startOfUtcDay(from) - DAY; day <= startOfUtcDay(to) + DAY; day += DAY) {
    const date = toIso(day).slice(0, 10)
    for (const [hour, minute] of times) {
      out.push(localToEpoch(offsets, zone, date + 'T' + pad2(hour) + ':' + pad2(minute) + ':00.000'))
      if (out.length > MAX_INSTANTS * 2) return out
    }
  }
  return out
}

function parseAt(text) {
  const match = AT_TIME.exec(text)
  return [Number(match[1]), Number(match[2])]
}

function cronTimes(schedule) {
  const times = []
  for (const hour of hoursOf(schedule.hour)) {
    for (const minute of minutesOf(schedule.minute)) times.push([hour, minute])
  }
  return times
}

function hoursOf(spec) {
  return numbers(spec ?? '*', 0, 23, 'hour')
}

function minutesOf(spec) {
  return numbers(spec ?? '*', 0, 59, 'minute')
}

function numbers(spec, low, high, label) {
  const text = String(spec).trim()
  if (text === '*') {
    const all = []
    for (let n = low; n <= high; n += 1) all.push(n)
    return all
  }
  const step = /^\*\/(\d+)$/.exec(text)
  if (step) {
    const by = Number(step[1])
    if (!(by >= 1)) throw new RangeError('cron ' + label + ' step must be >= 1')
    const all = []
    for (let n = low; n <= high; n += by) all.push(n)
    return all
  }
  const out = []
  for (const part of text.split(',')) {
    const n = Number(part.trim())
    if (!Number.isInteger(n) || n < low || n > high) {
      throw new RangeError('cron ' + label + ' out of range: ' + JSON.stringify(part))
    }
    out.push(n)
  }
  return out.sort((a, b) => a - b)
}
