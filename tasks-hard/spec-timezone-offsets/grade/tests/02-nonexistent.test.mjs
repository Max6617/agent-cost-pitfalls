// Sub-problem 2: wall clocks that never happened. A reading inside a skipped
// hour has to come back as the reading advanced by the length of the gap, and
// it has to say what happened.
import test from 'node:test'
import assert from 'node:assert/strict'
import { localToInstant, instantToLocal } from '../src/index.js'

const at = (iso) => Date.parse(iso)

test('a wall clock inside the skipped hour comes back shifted forward, and says so', () => {
  const ny = localToInstant('America/New_York', '2024-03-10T02:30:00')
  assert.equal(ny.resolution, 'nonexistent')
  assert.equal(ny.instant, at('2024-03-10T07:30:00Z'))
  assert.equal(ny.offsetMinutes, -240)
  assert.equal(ny.local.hour, 2)
  assert.equal(ny.local.minute, 30)
  // the instant it lands on is a real one, a whole hour later in local terms
  assert.equal(instantToLocal('America/New_York', ny.instant).hour, 3)
  assert.equal(instantToLocal('America/New_York', ny.instant).minute, 30)

  const berlin = localToInstant('Europe/Berlin', '2024-03-31T02:30:00')
  assert.equal(berlin.resolution, 'nonexistent')
  assert.equal(berlin.instant, at('2024-03-31T01:30:00Z'))
  assert.equal(berlin.offsetMinutes, 120)
  assert.equal(instantToLocal('Europe/Berlin', berlin.instant).hour, 3)
})

test('a gap narrower than an hour shifts by the length of that gap', () => {
  const lh = localToInstant('Australia/Lord_Howe', '2024-10-06T02:15:00')
  assert.equal(lh.resolution, 'nonexistent')
  assert.equal(lh.instant, at('2024-10-05T15:45:00Z'))
  assert.equal(lh.offsetMinutes, 660)
  const landed = instantToLocal('Australia/Lord_Howe', lh.instant)
  assert.equal(landed.hour, 2)
  assert.equal(landed.minute, 45)
})

test('the first reading of a gap and the first reading after it', () => {
  const first = localToInstant('Europe/Berlin', '2024-03-31T02:00:00')
  assert.equal(first.resolution, 'nonexistent')
  assert.equal(first.instant, at('2024-03-31T01:00:00Z'))
  const after = localToInstant('Europe/Berlin', '2024-03-31T03:00:00')
  assert.equal(after.resolution, 'exact')
  assert.equal(after.instant, at('2024-03-31T01:00:00Z'))

  const justBefore = localToInstant('America/New_York', '2024-03-10T01:59:59')
  assert.equal(justBefore.resolution, 'exact')
  assert.equal(justBefore.instant, at('2024-03-10T06:59:59Z'))
  const edge = localToInstant('America/New_York', '2024-03-10T02:00:00')
  assert.equal(edge.resolution, 'nonexistent')
  assert.equal(edge.instant, at('2024-03-10T07:00:00Z'))
})

test('a local midnight that never happened', () => {
  const santiago = localToInstant('America/Santiago', '2024-09-08T00:00:00')
  assert.equal(santiago.resolution, 'nonexistent')
  assert.equal(santiago.instant, at('2024-09-08T04:00:00Z'))
  assert.equal(santiago.offsetMinutes, -180)
  assert.equal(instantToLocal('America/Santiago', santiago.instant).hour, 1)
  assert.equal(instantToLocal('America/Santiago', santiago.instant).minute, 0)
})
