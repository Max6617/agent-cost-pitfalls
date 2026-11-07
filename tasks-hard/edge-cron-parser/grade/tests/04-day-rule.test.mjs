// Sub-problem 4: the day-of-month / day-of-week rule. Interaction: when both
// day fields are restricted either may decide the day, and "restricted" is a
// property of the text, so a field covering its whole domain still counts.
import test from 'node:test'
import assert from 'node:assert/strict'
import { nextOccurrences } from '../src/index.js'

test('with both day fields restricted either of them may decide the day', () => {
  assert.deepEqual(
    nextOccurrences('0 0 15 * MON', '2024-03-01T00:00:00Z', 4),
    [
      '2024-03-04T00:00:00Z',
      '2024-03-11T00:00:00Z',
      '2024-03-15T00:00:00Z',
      '2024-03-18T00:00:00Z',
    ],
  )
})

test('with one day field unrestricted the other one alone decides', () => {
  assert.deepEqual(
    nextOccurrences('0 0 1 * *', '2024-01-15T00:00:00Z', 3),
    ['2024-02-01T00:00:00Z', '2024-03-01T00:00:00Z', '2024-04-01T00:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 * * MON', '2024-03-01T00:00:00Z', 2),
    ['2024-03-04T00:00:00Z', '2024-03-11T00:00:00Z'],
  )
})

test('the day rule holds across a month that has no 31st', () => {
  assert.deepEqual(
    nextOccurrences('0 0 31 * MON', '2024-05-24T00:00:00Z', 4),
    [
      '2024-05-27T00:00:00Z',
      '2024-05-31T00:00:00Z',
      '2024-06-03T00:00:00Z',
      '2024-06-10T00:00:00Z',
    ],
  )
})

test('a day field that covers its whole domain is still a restricted one', () => {
  assert.deepEqual(
    nextOccurrences('0 0 1-31 * WED', '2024-03-01T12:00:00Z', 3),
    ['2024-03-02T00:00:00Z', '2024-03-03T00:00:00Z', '2024-03-04T00:00:00Z'],
  )
})
