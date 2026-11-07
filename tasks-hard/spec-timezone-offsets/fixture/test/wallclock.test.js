import test from 'node:test'
import assert from 'node:assert/strict'
import { instantToLocal, localToInstant } from '../src/index.js'

test('an instant in the middle of a day converts to the reading everyone expects', () => {
  const local = instantToLocal('Europe/Berlin', Date.parse('2024-06-15T12:00:00Z'))
  assert.equal(local.year, 2024)
  assert.equal(local.month, 6)
  assert.equal(local.day, 15)
  assert.equal(local.hour, 14)
  assert.equal(local.offsetMinutes, 120)
})

test('a wall clock in the skipped hour comes back flagged, not silently moved', () => {
  const result = localToInstant('Europe/Berlin', '2024-03-31T02:30:00')
  assert.equal(result.resolution, 'nonexistent')
})

test('a wall clock in the repeated hour comes back flagged', () => {
  const result = localToInstant('Europe/Berlin', '2024-10-27T02:30:00')
  assert.equal(result.resolution, 'ambiguous')
  assert.equal(result.instant, Date.parse('2024-10-27T00:30:00Z'))
})
