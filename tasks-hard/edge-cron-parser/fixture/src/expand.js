import { ScheduleError } from './errors.js'
import { lookup, wholeDomain } from './domain.js'

/**
 * One field of an expression -> the ascending list of values it selects.
 *
 * A field is a comma separated list of items, and every item contributes the
 * values of its own sequence: `1,15-20,30` is the union of three sequences.
 */
export function expandField(field, text) {
  const values = new Set()
  for (const item of String(text).split(',')) {
    for (const v of expandItem(field, item)) values.add(v)
  }
  return [...values].sort((a, b) => a - b)
}

/** One comma separated item -> the values it selects. */
export function expandItem(field, item) {
  const slash = item.indexOf('/')
  const body = slash === -1 ? item : item.slice(0, slash)
  const stepText = slash === -1 ? null : item.slice(slash + 1)
  const step = stepText === null ? 1 : readStep(stepText)

  if (body === '') throw new ScheduleError('value', 'empty item in the ' + field.name + ' field')
  if (body === '*') return pick(field, wholeDomain(field), step)
  if (body.includes('-')) return pick(field, rangeValues(field, body), step)
  return [requireValue(field, body)]
}

/** A step below 1, or a step that is not a number at all, is treated as 1. */
function readStep(text) {
  const n = Math.trunc(Number(text))
  return Number.isFinite(n) && n > 1 ? n : 1
}

/**
 * Walk the field's own grid and keep the values the item selected.
 */
function pick(field, values, step) {
  const selected = new Set(values)
  const out = []
  for (let v = field.min; v <= field.max; v += step) {
    if (selected.has(v)) out.push(v)
  }
  return out
}

/** The values of `A-B`, including both endpoints. */
function rangeValues(field, body) {
  const parts = body.split('-')
  if (parts.length < 2) throw new ScheduleError('range', 'a range needs two endpoints: ' + body)
  const start = requireValue(field, parts[0])
  const end = requireValue(field, parts[1])
  if (end > field.max) throw new ScheduleError('range', 'range ends after the domain: ' + body)
  const out = []
  if (start <= end) {
    for (let v = start; v <= end; v += 1) out.push(v)
  } else {
    // The range runs off the end of the domain and continues at the beginning.
    for (let v = start; v <= field.max; v += 1) out.push(v)
    for (let v = field.min; v < end; v += 1) out.push(v)
  }
  return out
}

function requireValue(field, token) {
  const v = lookup(field, token)
  if (v > field.max) {
    throw new ScheduleError('value', '"' + token + '" is not a ' + field.name + ' value')
  }
  return v
}
