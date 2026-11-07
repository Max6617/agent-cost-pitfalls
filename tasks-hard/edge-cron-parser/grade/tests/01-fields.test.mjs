// Sub-problem 1: the shape of an expression, and which tokens and values a
// field accepts. Interaction: `?` is a value of the two day fields only, and a
// six field expression re-lays-out every field after the first.
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

test('a six field expression is the five field one with a leading seconds field', () => {
  assert.equal(code(() => parseSchedule('* * * * * *')), null)
  assert.deepEqual(
    nextOccurrences('30 0 12 * * *', '2024-03-01T11:00:00Z', 2),
    ['2024-03-01T12:00:30Z', '2024-03-02T12:00:30Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 0 12 * * *', '2024-03-01T11:00:00Z', 1),
    ['2024-03-01T12:00:00Z'],
  )
})

test('? selects the whole domain in the day fields and is an error in the others', () => {
  assert.deepEqual(
    nextOccurrences('0 12 ? * MON', '2024-03-01T00:00:00Z', 2),
    ['2024-03-04T12:00:00Z', '2024-03-11T12:00:00Z'],
  )
  assert.deepEqual(
    nextOccurrences('0 12 ? * *', '2024-03-01T00:00:00Z', 1),
    ['2024-03-01T12:00:00Z'],
  )
  assert.equal(code(() => parseSchedule('? * * * *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 ? * ?')), null)
  assert.equal(code(() => parseSchedule('0 0 ? ? *')), 'value')
})

test('a value outside its field is refused, at the bottom of the domain too', () => {
  assert.equal(code(() => parseSchedule('0 0 0 1 *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 1 0 *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 1 13 *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 * * 8')), 'value')
  assert.equal(code(() => parseSchedule('0 60 * * *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 32 1 *')), 'value')
})

test('tokens this dialect does not define are reported, not planned around', () => {
  assert.equal(code(() => parseSchedule('0 0 L * *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 1W * *')), 'value')
  assert.equal(code(() => parseSchedule('0 0 * * FUNDAY')), 'value')
  assert.equal(code(() => parseSchedule('0 0 1,,5 * *')), 'value')
  assert.equal(code(() => nextOccurrences('0 0 1 * *', '2024-01-01T00:00:00Z', 0)), 'value')
})
