// Sub-problem 2: steps and ranges, including the ones that wrap around the end
// of the domain. Interaction: a step over a wrapped range counts positions in
// the wrapped sequence, and a step on a single value runs to the domain end.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSchedule, nextOccurrences, ScheduleError } from '../src/index.js'

const code = (fn) => {
  try {
    fn()
    return null
  } catch (error) {
    return error instanceof ScheduleError ? error.code : 'not-a-ScheduleError:' + error.name
  }
}

test('a step counts from the start of its own range, not from the domain start', () => {
  assert.deepEqual(
    nextOccurrences('0 9-17/4 * * *', '2024-03-01T00:00:00Z', 3),
    ['2024-03-01T09:00:00Z', '2024-03-01T13:00:00Z', '2024-03-01T17:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('1-30/3 * * * *', '2024-03-01T00:00:00Z', 3),
    ['2024-03-01T00:01:00Z', '2024-03-01T00:04:00Z', '2024-03-01T00:07:00Z'],
  )
})

test('a range whose start is after its end runs off the domain and continues at the start', () => {
  assert.deepEqual(
    nextOccurrences('0 22-2 * * *', '2024-03-01T21:00:00Z', 5),
    [
      '2024-03-01T22:00:00Z',
      '2024-03-01T23:00:00Z',
      '2024-03-02T00:00:00Z',
      '2024-03-02T01:00:00Z',
      '2024-03-02T02:00:00Z',
    ],
  )
})

test('a step over a wrapped range walks the wrapped sequence', () => {
  // 22-2 is 22, 23, 0, 1, 2; every second value of that sequence is 22, 0, 2.
  assert.deepEqual(
    nextOccurrences('0 22-2/2 * * *', '2024-03-01T00:30:00Z', 3),
    ['2024-03-01T02:00:00Z', '2024-03-01T22:00:00Z', '2024-03-02T00:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 1 NOV-FEB *', '2024-12-15T00:00:00Z', 2),
    ['2025-01-01T00:00:00Z', '2025-02-01T00:00:00Z'],
  )
})

test('a single value with a step runs on to the end of the domain', () => {
  assert.deepEqual(
    nextOccurrences('5/10 * * * *', '2024-03-01T00:00:00Z', 3),
    ['2024-03-01T00:05:00Z', '2024-03-01T00:15:00Z', '2024-03-01T00:25:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 1 JAN/3 *', '2024-01-01T00:00:00Z', 2),
    ['2024-04-01T00:00:00Z', '2024-07-01T00:00:00Z'],
  )
})

test('a range or a step that cannot be read is reported', () => {
  assert.equal(code(() => parseSchedule('0 0 1-2-3 * *')), 'range')
  assert.equal(code(() => parseSchedule('0 -1 * * *')), 'range')
  assert.equal(code(() => parseSchedule('0 0 5- * *')), 'range')
  assert.equal(code(() => parseSchedule('0 0 1/2/3 * *')), 'range')
  assert.equal(code(() => parseSchedule('1-30/0 * * * *')), 'range')
  assert.equal(code(() => parseSchedule('*/-1 * * * *')), 'range')
})

test('a step over a whole domain starts at the start of that domain', () => {
  assert.deepEqual(
    nextOccurrences('*/5 * * * *', '2024-03-01T12:01:00Z', 3),
    ['2024-03-01T12:05:00Z', '2024-03-01T12:10:00Z', '2024-03-01T12:15:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 */6 * * *', '2024-03-01T00:30:00Z', 3),
    ['2024-03-01T06:00:00Z', '2024-03-01T12:00:00Z', '2024-03-01T18:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 */5 * *', '2024-03-02T00:00:00Z', 3),
    ['2024-03-06T00:00:00Z', '2024-03-11T00:00:00Z', '2024-03-16T00:00:00Z'],
  )
})
