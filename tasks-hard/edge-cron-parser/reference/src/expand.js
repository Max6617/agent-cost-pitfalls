import { ScheduleError } from './errors.js'
import { lookup, normalize, wholeDomain } from './domain.js'

/**
 * One field of an expression -> the ascending list of values it selects.
 *
 * A field is a comma separated list of items, and every item contributes the
 * values of its own sequence: `1,15-20,30` is the union of three sequences.
 */
export function expandField(field, text) {
  const values = new Set()
  for (const item of String(text).split(',')) {
    for (const v of expandItem(field, item)) values.add(normalize(field, v))
  }
  return [...values].sort((a, b) => a - b)
}

/** One comma separated item -> the values it selects. */
export function expandItem(field, item) {
  const slash = item.indexOf('/')
  if (slash !== -1 && item.indexOf('/', slash + 1) !== -1) {
    throw new ScheduleError('range', 'an item has one step at most: ' + item)
  }
  const body = slash === -1 ? item : item.slice(0, slash)
  const step = slash === -1 ? null : readStep(item.slice(slash + 1))

  if (body === '') throw new ScheduleError('value', 'empty item in the ' + field.name + ' field')
  if (body === '*') return select(wholeDomain(field), step)
  if (body === '?') {
    if (!field.question) {
      throw new ScheduleError('value', '"?" is only allowed in the day-of-month and day-of-week fields')
    }
    return select(wholeDomain(field), step)
  }
  if (body.includes('-')) return select(rangeValues(field, body), step)
  if (step === null) return [requireValue(field, body)]
  return select(valueSequence(field, requireValue(field, body)), step)
}

/** Every Nth value of the item's own sequence, counting from its first. */
function select(sequence, step) {
  if (step === null || step === 1) return sequence
  return sequence.filter((_, index) => index % step === 0)
}

/** A step is a positive integer written in decimal. */
function readStep(text) {
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    throw new ScheduleError('range', 'a step is a positive integer, not "' + text + '"')
  }
  return Number(text)
}

/** `V/N`: V, V+N, V+2N, ... up to the end of the domain. */
function valueSequence(field, value) {
  const out = []
  for (let v = value; v <= field.max; v += 1) out.push(v)
  return out
}

/** The values of `A-B`, including both endpoints, wrapping when A > B. */
function rangeValues(field, body) {
  const parts = body.split('-')
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
    throw new ScheduleError('range', 'a range is written A-B: ' + body)
  }
  const start = requireValue(field, parts[0])
  const end = requireValue(field, parts[1])
  const out = []
  if (start <= end) {
    for (let v = start; v <= end; v += 1) out.push(v)
  } else {
    // The range runs off the end of the domain and continues at the beginning.
    for (let v = start; v <= field.max; v += 1) out.push(v)
    for (let v = field.min; v <= end; v += 1) out.push(v)
  }
  return out
}

function requireValue(field, token) {
  const v = lookup(field, token)
  if (v === null || v < field.min || v > field.max) {
    throw new ScheduleError('value', '"' + token + '" is not a ' + field.name + ' value')
  }
  return v
}
