// Sub-problem 3: wall clocks that happen twice. The service takes the earlier
// occurrence and says so, and an instant inside the repeated hour round-trips to
// that earlier occurrence rather than to itself.
import test from 'node:test'
import assert from 'node:assert/strict'
import { localToInstant, instantToLocal } from '../src/index.js'

const at = (iso) => Date.parse(iso)

test('a reading in the repeated hour means the earlier of the two instants', () => {
  const berlin = localToInstant('Europe/Berlin', '2024-10-27T02:30:00')
  assert.equal(berlin.resolution, 'ambiguous')
  assert.equal(berlin.instant, at('2024-10-27T00:30:00Z'))
  assert.equal(berlin.offsetMinutes, 120)
  assert.equal(instantToLocal('Europe/Berlin', berlin.instant).hour, 2)

  const ny = localToInstant('America/New_York', '2024-11-03T01:30:00')
  assert.equal(ny.resolution, 'ambiguous')
  assert.equal(ny.instant, at('2024-11-03T05:30:00Z'))
  assert.equal(ny.offsetMinutes, -240)
})

test('a fall-back of half an hour repeats half an hour and no more', () => {
  const repeated = localToInstant('Australia/Lord_Howe', '2024-04-07T01:45:00')
  assert.equal(repeated.resolution, 'ambiguous')
  assert.equal(repeated.instant, at('2024-04-06T14:45:00Z'))
  assert.equal(repeated.offsetMinutes, 660)

  const once = localToInstant('Australia/Lord_Howe', '2024-04-07T02:15:00')
  assert.equal(once.resolution, 'exact')
  assert.equal(once.instant, at('2024-04-06T15:45:00Z'))
})

test('a midnight that happened twice', () => {
  const havana = localToInstant('America/Havana', '2024-11-03T00:00:00')
  assert.equal(havana.resolution, 'ambiguous')
  assert.equal(havana.instant, at('2024-11-03T04:00:00Z'))
  assert.equal(havana.offsetMinutes, -240)
  const landed = instantToLocal('America/Havana', havana.instant)
  assert.equal(landed.hour, 0)
  assert.equal(landed.minute, 0)
})

test('an instant inside the repeated hour round-trips to the earlier occurrence', () => {
  const later = at('2024-11-03T06:30:00Z')
  const reading = instantToLocal('America/New_York', later)
  assert.equal(reading.hour, 1)
  assert.equal(reading.minute, 30)
  assert.equal(reading.offsetMinutes, -300)
  const round = localToInstant('America/New_York', reading)
  assert.equal(round.resolution, 'ambiguous')
  assert.equal(round.instant, at('2024-11-03T05:30:00Z'))

  const earlier = at('2024-11-03T05:30:00Z')
  const first = instantToLocal('America/New_York', earlier)
  assert.equal(first.offsetMinutes, -240)
  assert.equal(localToInstant('America/New_York', first).instant, earlier)
})
