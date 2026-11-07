// Sub-problem 1: the offset in force at an instant, including which side of a
// transition instant owns the boundary, and what that boundary does to the
// local reading.
import test from 'node:test'
import assert from 'node:assert/strict'
import { offsetAt, instantToLocal } from '../src/index.js'

const at = (iso) => Date.parse(iso)

test('an offset holds from its own instant until the next transition', () => {
  assert.equal(offsetAt('America/New_York', at('2024-01-15T12:00:00Z')), -300)
  assert.equal(offsetAt('America/New_York', at('2024-06-01T12:00:00Z')), -240)
  assert.equal(offsetAt('America/New_York', at('2024-12-01T12:00:00Z')), -300)
  assert.equal(offsetAt('Europe/Berlin', at('2023-12-01T12:00:00Z')), 60)
  assert.equal(offsetAt('Europe/Lisbon', at('2024-01-15T12:00:00Z')), 0)
  assert.equal(offsetAt('Australia/Lord_Howe', at('2024-01-15T00:00:00Z')), 660)
  assert.equal(offsetAt('America/Santiago', at('2024-01-15T12:00:00Z')), -180)
})

test('a transition takes effect at its own instant', () => {
  assert.equal(offsetAt('America/New_York', at('2024-03-10T07:00:00Z')), -240)
  assert.equal(offsetAt('America/New_York', at('2024-11-03T06:00:00Z')), -300)
  assert.equal(offsetAt('Europe/Berlin', at('2024-03-31T01:00:00Z')), 120)
  assert.equal(offsetAt('America/Havana', at('2024-03-10T05:00:00Z')), -240)
  assert.equal(offsetAt('Australia/Lord_Howe', at('2024-10-05T15:30:00Z')), 660)
  assert.equal(offsetAt('America/Santiago', at('2024-09-08T04:00:00Z')), -180)
  assert.equal(offsetAt('Pacific/Auckland', at('2024-09-28T14:00:00Z')), 780)
})

test('the transition instant is the first instant of the new offset', () => {
  const ny = at('2024-03-10T07:00:00Z')
  assert.equal(offsetAt('America/New_York', ny - 1), -300)
  assert.equal(instantToLocal('America/New_York', ny - 1).hour, 1)
  assert.equal(instantToLocal('America/New_York', ny - 1).minute, 59)
  assert.equal(instantToLocal('America/New_York', ny - 1).offsetMinutes, -300)
  assert.equal(instantToLocal('America/New_York', ny).hour, 3)
  assert.equal(instantToLocal('America/New_York', ny).minute, 0)
  assert.equal(instantToLocal('America/New_York', ny).offsetMinutes, -240)

  const berlin = at('2024-03-31T01:00:00Z')
  assert.equal(instantToLocal('Europe/Berlin', berlin - 1).hour, 1)
  assert.equal(instantToLocal('Europe/Berlin', berlin - 1).offsetMinutes, 60)
  assert.equal(instantToLocal('Europe/Berlin', berlin).hour, 3)
  assert.equal(instantToLocal('Europe/Berlin', berlin).offsetMinutes, 120)
})
