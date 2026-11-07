import { fieldByName } from './domain.js'
import { expandField } from './expand.js'
import { ScheduleError } from './errors.js'

/** The fields of a five field expression, in the order they are written. */
export const FIVE_FIELD_ORDER = Object.freeze([
  'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek',
])

/** A schedule: the values each field selected, plus what the text looked like. */
export function parseSchedule(expression) {
  if (typeof expression !== 'string') {
    throw new ScheduleError('field-count', 'a schedule expression is a string')
  }
  const parts = expression.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== FIVE_FIELD_ORDER.length) {
    throw new ScheduleError(
      'field-count',
      'a schedule has ' + FIVE_FIELD_ORDER.length + ' fields, this one has ' + parts.length,
    )
  }

  const fields = { second: [0] }
  const restricted = { second: false }
  for (let i = 0; i < FIVE_FIELD_ORDER.length; i += 1) {
    const name = FIVE_FIELD_ORDER[i]
    fields[name] = expandField(fieldByName(name), parts[i])
    restricted[name] = parts[i] !== '*'
  }

  return {
    expression: expression.trim(),
    fieldCount: FIVE_FIELD_ORDER.length,
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
