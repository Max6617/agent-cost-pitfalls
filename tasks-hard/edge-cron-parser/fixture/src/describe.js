import { toSchedule } from './parse.js'

const FIELD_ORDER = ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']

const LABELS = {
  second: 'second',
  minute: 'minute',
  hour: 'hour',
  dayOfMonth: 'day of month',
  month: 'month',
  dayOfWeek: 'day of week',
}

/**
 * A one line rendering of a schedule, for the CLI and for log lines. It is a
 * debugging aid: the format is not part of the contract and may change.
 */
export function describeSchedule(expression) {
  const schedule = toSchedule(expression)
  const parts = []
  for (const name of FIELD_ORDER) {
    const values = schedule.fields[name]
    parts.push(LABELS[name] + '=' + (values.length > 12 ? values.length + ' values' : values.join(',')))
  }
  return parts.join(' ')
}
