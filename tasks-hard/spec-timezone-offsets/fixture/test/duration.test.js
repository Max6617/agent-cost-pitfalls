import test from 'node:test'
import assert from 'node:assert/strict'
import { addToInstant, addToLocal } from '../src/index.js'

test('elapsed hours are elapsed hours', () => {
  const result = addToInstant('America/New_York', Date.parse('2024-06-15T12:00:00Z'), { hours: 2 })
  assert.equal(result.instant, Date.parse('2024-06-15T14:00:00Z'))
})

test('a day is 24 hours even when the clocks move', () => {
  const result = addToInstant('America/New_York', Date.parse('2024-03-09T17:00:00Z'), { days: 1 })
  assert.equal(result.instant, Date.parse('2024-03-10T17:00:00Z'))
})

test('a day on a wall clock keeps its time of day', () => {
  const result = addToLocal('America/New_York', '2024-03-09T12:00:00', { days: 1 })
  assert.equal(result.local.hour, 12)
  assert.equal(result.instant, Date.parse('2024-03-10T16:00:00Z'))
})
