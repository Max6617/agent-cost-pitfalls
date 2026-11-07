import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice } from '../src/index.js'

const hall = () =>
  createVenue({
    rows: [
      { id: 'A', count: 9, aislesAfter: [3, 6] },
      { id: 'B', count: 9, aislesAfter: [3, 6], accessible: [1, 2, 8, 9] },
    ],
  })

test('accessible seats open to a general request when no standard block fits', () => {
  const office = createBoxOffice(hall())
  office.placeHold({ id: 'h-1', seats: ['A1', 'A2'], ttl: 5000 }, 100)
  office.placeHold({ id: 'h-2', seats: ['A4', 'A5', 'A6'], ttl: 5000 }, 100)
  office.placeHold({ id: 'h-3', seats: ['A8', 'A9'], ttl: 5000 }, 100)
  office.placeHold({ id: 'h-4', seats: ['B4', 'B5', 'B6'], ttl: 5000 }, 100)
  const result = office.requestGroup({ size: 2 }, 200)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['B1', 'B2'])
})

test('an accessible request is offered accessible seats', () => {
  const office = createBoxOffice(hall())
  office.placeHold({ id: 'h-1', seats: ['B1', 'B2'], ttl: 5000 }, 100)
  const result = office.requestGroup({ size: 2, needsAccessible: true }, 200)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['B8', 'B9'])
})
