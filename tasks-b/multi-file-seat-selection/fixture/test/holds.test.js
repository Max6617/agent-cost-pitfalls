import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice } from '../src/index.js'

const hall = () => createVenue({ rows: [{ id: 'A', count: 9, aislesAfter: [3, 6] }] })

test('a hold is no longer active at its expiry moment', () => {
  const office = createBoxOffice(hall())
  const placed = office.placeHold({ id: 'h-1', seats: ['A2', 'A3'], ttl: 45 }, 2000)
  assert.equal(placed.status, 'ok')
  assert.equal(placed.expiresAt, 2045)
  assert.equal(office.activeHolds(2044).length, 1)
  assert.deepEqual(office.activeHolds(2045), [])
})

test('confirming at the expiry moment is too late', () => {
  const office = createBoxOffice(hall())
  office.placeHold({ id: 'h-2', seats: ['A2', 'A3'], ttl: 45 }, 2000)
  assert.equal(office.confirmHold('h-2', 2045).status, 'hold-expired')
})
