// Sub-problem 3: names, their case, and the numbering of the days of the week.
// Interaction: a name range wraps exactly like a numeric one, and 7 is Sunday,
// which changes what a range that mentions it selects.
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

test('names are matched without regard to case', () => {
  assert.deepEqual(
    nextOccurrences('0 12 * * mon', '2024-03-01T00:00:00Z', 2),
    ['2024-03-04T12:00:00Z', '2024-03-11T12:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 1 jan *', '2024-03-01T00:00:00Z', 1),
    ['2025-01-01T00:00:00Z'],
  )
  assert.equal(code(() => parseSchedule('0 12 * * Mon-Fri')), null)
  assert.equal(code(() => parseSchedule('0 0 1 Dec *')), null)
})

test('0, 7 and SUN are all Sunday and describe the same schedule', () => {
  assert.equal(matches('0 12 * * 7', '2024-03-03T12:00:00Z'), true)
  assert.equal(matches('0 12 * * 0', '2024-03-03T12:00:00Z'), true)
  assert.deepEqual(
    nextOccurrences('0 12 * * 7', '2024-03-01T00:00:00Z', 2),
    nextOccurrences('0 12 * * SUN', '2024-03-01T00:00:00Z', 2),
  )
})

test('a named range selects the days it names, wrapping when it has to', () => {
  assert.deepEqual(
    nextOccurrences('0 9 * * MON-FRI', '2024-03-02T00:00:00Z', 3),
    ['2024-03-04T09:00:00Z', '2024-03-05T09:00:00Z', '2024-03-06T09:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 1 JAN,JUL *', '2024-02-01T00:00:00Z', 2),
    ['2024-07-01T00:00:00Z', '2025-01-01T00:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 12 * * FRI-SUN', '2024-03-01T00:00:00Z', 3),
    ['2024-03-01T12:00:00Z', '2024-03-02T12:00:00Z', '2024-03-03T12:00:00Z'],
  )
})
