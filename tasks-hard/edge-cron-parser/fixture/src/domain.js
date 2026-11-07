import { ScheduleError } from './errors.js'

/** Month names, as the scheduler UI writes them. */
export const MONTH_NAMES = Object.freeze({
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
})

/** Day names. The calendar numbers Sunday 0 and so do we. */
export const DAY_NAMES = Object.freeze({
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
})

export const FIELDS = Object.freeze([
  { name: 'second', min: 0, max: 59, names: null },
  { name: 'minute', min: 0, max: 59, names: null },
  { name: 'hour', min: 0, max: 23, names: null },
  { name: 'dayOfMonth', min: 1, max: 31, names: null },
  { name: 'month', min: 1, max: 12, names: MONTH_NAMES },
  { name: 'dayOfWeek', min: 0, max: 7, names: DAY_NAMES },
])

const BY_NAME = new Map(FIELDS.map((field) => [field.name, field]))

export function fieldByName(name) {
  const field = BY_NAME.get(name)
  if (!field) throw new ScheduleError('field-count', 'no such field: ' + name)
  return field
}

/**
 * The number a token stands for in a field. A name is looked up in the field's
 * table; anything else is read as a number, and a token that is not a number
 * comes back as NaN.
 */
export function lookup(field, token) {
  if (field.names && Object.hasOwn(field.names, token)) return field.names[token]
  return Number(token)
}

/** Every value the field's domain contains, ascending. */
export function wholeDomain(field) {
  const values = []
  for (let v = field.min; v <= field.max; v += 1) values.push(v)
  return values
}
