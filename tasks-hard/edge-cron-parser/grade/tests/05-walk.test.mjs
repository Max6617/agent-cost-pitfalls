// Sub-problem 5: walking to the next occurrence. Interaction: a leap day is
// more than a year away, and a schedule that can never run has to be reported
// rather than searched for until the caller gives up.
import test from 'node:test'
import assert from 'node:assert/strict'
import { nextOccurrences, matches, ScheduleError } from '../src/index.js'

const code = (fn) => {
  try {
    fn()
    return null
  } catch (error) {
    return error instanceof ScheduleError ? error.code : 'not-a-ScheduleError:' + error.name
  }
}

test('the next occurrence is strictly after the instant it was given', () => {
  assert.equal(matches('0 12 * * *', '2024-03-01T12:00:00Z'), true)
  assert.deepEqual(
    nextOccurrences('0 12 * * *', '2024-03-01T12:00:00Z', 1),
    ['2024-03-02T12:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 12 * * *', '2024-03-01T12:00:00.900Z', 1),
    ['2024-03-02T12:00:00Z'],
  )
})

test('a leap day schedule is found across the non-leap years in between', () => {
  assert.deepEqual(
    nextOccurrences('0 0 29 2 *', '2023-03-01T00:00:00Z', 1),
    ['2024-02-29T00:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 29 2 *', '2024-02-29T00:00:00Z', 1),
    ['2028-02-29T00:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 29 2 *', '2024-03-01T00:00:00Z', 1),
    ['2028-02-29T00:00:00Z'],
  )
})

test('a schedule that can never run is reported, one that only looks impossible is not', () => {
  assert.equal(code(() => nextOccurrences('0 0 31 2 *', '2024-01-01T00:00:00Z', 1)), 'no-occurrence')
  assert.equal(code(() => nextOccurrences('0 0 30 2 *', '2024-01-01T00:00:00Z', 1)), 'no-occurrence')
  assert.deepEqual(
    nextOccurrences('0 0 31 4 MON', '2024-04-01T00:00:00Z', 2),
    ['2024-04-08T00:00:00Z', '2024-04-15T00:00:00Z'],
  )
})

test('a schedule walks out of the year it starts in', () => {
  assert.deepEqual(
    nextOccurrences('0 0 1 1 *', '2024-06-15T08:30:00Z', 1),
    ['2025-01-01T00:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 1 1 *', '2024-12-31T23:59:59Z', 1),
    ['2025-01-01T00:00:00Z'],
  )
})
