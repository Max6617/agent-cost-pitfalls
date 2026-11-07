// Sub-problem 3: a hold lives strictly until its expiry moment - at that
// moment it stops blocking, stops confirming, and its seats are free to take.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice } from '../src/index.js'

const oneRow = () => createVenue({ rows: [{ id: 'A', count: 9, aislesAfter: [3, 6] }] })
const flatRow = () => createVenue({ rows: [{ id: 'A', count: 9 }] })

test('an active hold keeps its seats out of allocation', () => {
  const office = createBoxOffice(flatRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  const result = office.requestGroup({ size: 2 }, 1010)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A6', 'A7'])
})

test('a hold is no longer listed at its expiry moment', () => {
  const office = createBoxOffice(oneRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  assert.equal(office.activeHolds(1029).length, 1)
  assert.deepEqual(office.activeHolds(1030), [])
})

test('a lapsed hold frees its block for allocation at the same moment', () => {
  const office = createBoxOffice(oneRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  const result = office.requestGroup({ size: 2 }, 1030)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A4', 'A5'])
})

test('a lapsed hold cannot be confirmed', () => {
  const office = createBoxOffice(oneRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  assert.equal(office.confirmHold('h-1', 1030).status, 'hold-expired')
  assert.deepEqual([...office.blockedSeats(1031)], [])
})

test('seats under a lapsed hold can be held again at the same moment', () => {
  const office = createBoxOffice(oneRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  office.placeHold({ id: 'h-2', seats: ['A7', 'A8'], ttl: 30 }, 1000)
  const again = office.placeHold({ id: 'h-3', seats: ['A4', 'A5'], ttl: 30 }, 1030)
  assert.equal(again.status, 'ok')
  assert.equal(again.expiresAt, 1060)
})
