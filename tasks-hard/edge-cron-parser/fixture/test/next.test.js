import test from 'node:test'
import assert from 'node:assert/strict'
import { nextOccurrences, ScheduleError } from '../src/index.js'

test('a monthly job lands on the first of the next month', () => {
  assert.deepEqual(
    nextOccurrences('0 0 1 * *', '2024-01-15T00:00:00Z', 2),
    ['2024-02-01T00:00:00Z', '2024-03-01T00:00:00Z'],
  )
})

test('a job on the fifteenth and on Mondays runs on both', () => {
  assert.deepEqual(
    nextOccurrences('0 0 15 * MON', '2024-03-01T00:00:00Z', 3),
    ['2024-03-04T00:00:00Z', '2024-03-11T00:00:00Z', '2024-03-15T00:00:00Z'],
  )
})

test('a schedule that can never run says so instead of returning nothing', () => {
  assert.throws(
    () => nextOccurrences('0 0 31 2 *', '2024-01-01T00:00:00Z', 1),
    (error) => error instanceof ScheduleError && error.code === 'no-occurrence',
  )
})
