import { fieldByName } from './domain.js'
import { expandField } from './expand.js'
import { ScheduleError } from './errors.js'

/** The fields of a five field expression, in the order they are written. */
export const FIVE_FIELD_ORDER = Object.freeze([
  'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek',
])

/** A six field expression is a five field one with a leading seconds field. */
export const SIX_FIELD_ORDER = Object.freeze(['second', ...FIVE_FIELD_ORDER])

/** A schedule: the values each field selected, plus what the text looked like. */
export function parseSchedule(expression) {
  if (typeof expression !== 'string') {
    throw new ScheduleError('field-count', 'a schedule expression is a string')
  }
  const parts = expression.trim().split(/\s+/).filter((part) => part.length > 0)
  const order = parts.length === 5 ? FIVE_FIELD_ORDER
    : parts.length === 6 ? SIX_FIELD_ORDER
      : null
  if (!order) {
    throw new ScheduleError(
      'field-count',
      'a schedule has 5 or 6 fields, this one has ' + parts.length,
    )
  }

  const fields = {}
  const restricted = {}
  if (order === FIVE_FIELD_ORDER) {
    fields.second = [0]
    restricted.second = false
  }
  for (let i = 0; i < order.length; i += 1) {
    const name = order[i]
    fields[name] = expandField(fieldByName(name), parts[i])
    // Restricted is a property of the text: `?` is not a restriction, and a
    // field that happens to cover its whole domain still is one.
    restricted[name] = parts[i] !== '*' && parts[i] !== '?'
  }

  return {
    expression: expression.trim(),
    fieldCount: order.length,
    fields,
    restricted,
  }
}

/** Accepts either an expression or an already parsed schedule. */
export function toSchedule(input) {
  if (typeof input === 'string') return parseSchedule(input)
  if (input && typeof input === 'object' && input.fields) return input
  throw new ScheduleError('field-count', 'expected an expression or a parsed schedule')
}
