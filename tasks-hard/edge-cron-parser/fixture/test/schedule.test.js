import test from 'node:test'
import assert from 'node:assert/strict'
import { nextOccurrences } from '../src/index.js'

test('every minute picks the next minute boundary', () => {
  assert.deepEqual(
    nextOccurrences('* * * * *', '2024-03-01T12:00:30Z', 1),
    ['2024-03-01T12:01:00Z'],
  )
})

test('every fifteen minutes stays on the quarter hours', () => {
  assert.deepEqual(
    nextOccurrences('*/15 * * * *', '2024-03-01T12:01:00Z', 3),
    ['2024-03-01T12:15:00Z', '2024-03-01T12:30:00Z', '2024-03-01T12:45:00Z'],
  )
})

test('a stepped range fires on the minutes the range names', () => {
  // "1-10/3" is minutes 1, 4, 7 and 10 - the step counts from 1, not from 0.
  assert.deepEqual(
    nextOccurrences('1-10/3 * * * *', '2024-03-01T00:00:00Z', 3),
    ['2024-03-01T00:01:00Z', '2024-03-01T00:04:00Z', '2024-03-01T00:07:00Z'],
  )
})

test('a weekday range starts the working week on Monday', () => {
  assert.deepEqual(
    nextOccurrences('0 9 * * MON-FRI', '2024-03-02T00:00:00Z', 2),
    ['2024-03-04T09:00:00Z', '2024-03-05T09:00:00Z'],
  )
})

test('sunday can be written as 7', () => {
  assert.deepEqual(
    nextOccurrences('0 12 * * 7', '2024-03-01T00:00:00Z', 1),
    ['2024-03-03T12:00:00Z'],
  )
})
