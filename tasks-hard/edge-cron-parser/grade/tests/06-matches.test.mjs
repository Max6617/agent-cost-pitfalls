// Sub-problem 6: `matches` has to give the walk's answer without walking.
// Interaction: the seconds field is part of the answer, and a day the day rule
// adds is a day the walk must produce and `matches` must accept.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSchedule, nextOccurrences, matches, ScheduleError } from '../src/index.js'

const code = (fn) => {
  try {
    fn()
    return null
  } catch (error) {
    return error instanceof ScheduleError ? error.code : 'not-a-ScheduleError:' + error.name
  }
}

test('matches is as precise as the schedule, seconds included', () => {
  assert.equal(matches('0 12 * * *', '2024-03-01T12:00:00Z'), true)
  assert.equal(matches('0 12 * * *', '2024-03-01T12:00:30Z'), false)
  assert.equal(matches('30 0 12 * * *', '2024-03-01T12:00:30Z'), true)
  assert.equal(matches('30 0 12 * * *', '2024-03-01T12:00:00Z'), false)
})

test('matches accepts an instant the walk returns for a day the day rule added', () => {
  assert.equal(matches('0 0 15 * MON', '2024-04-01T00:00:00Z'), true)
  assert.deepEqual(
    nextOccurrences('0 0 15 * MON', '2024-03-31T00:00:00Z', 3),
    ['2024-04-01T00:00:00Z', '2024-04-08T00:00:00Z', '2024-04-15T00:00:00Z'],
  )
})

test('matches reports a bad expression or a bad instant instead of answering no', () => {
  assert.equal(code(() => matches('nonsense', '2024-03-01T00:00:00Z')), 'field-count')
  assert.equal(code(() => matches('0 0 * * 9', '2024-03-01T00:00:00Z')), 'value')
  assert.equal(code(() => matches('0 0 * * *', '2024-02-30T00:00:00Z')), 'instant')
  assert.equal(code(() => matches('0 0 * * *', '2024-03-01T24:00:00Z')), 'instant')
  assert.equal(code(() => matches('0 0 * * *', '2023-02-29T00:00:00Z')), 'instant')
})

test('matches never claims a day the schedule cannot reach', () => {
  assert.equal(matches('0 0 29 2 *', '2024-02-29T00:00:00Z'), true)
  assert.equal(matches('0 0 29 2 *', '2024-02-28T00:00:00Z'), false)
  assert.equal(matches('0 0 29 2 *', '2023-03-01T00:00:00Z'), false)
  assert.equal(matches('0 0 31 2 *', '2024-03-01T00:00:00Z'), false)
  assert.equal(matches('0 0 * * *', '2024-03-01T05:30:00+05:30'), true)
  assert.equal(matches('0 0 * * *', '2024-03-01T00:00:00'), true)
})
