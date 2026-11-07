import test from 'node:test'
import assert from 'node:assert/strict'
import { matches, parseSchedule, ScheduleError } from '../src/index.js'

test('matches answers for the instants the schedule names', () => {
  assert.equal(matches('0 12 * * *', '2024-03-01T12:00:00Z'), true)
  assert.equal(matches('0 12 * * *', '2024-03-02T13:00:00Z'), false)
})

test('a minute value above the domain is refused when the schedule is parsed', () => {
  assert.throws(
    () => parseSchedule('70 * * * *'),
    (error) => error instanceof ScheduleError && error.code === 'value',
  )
})
