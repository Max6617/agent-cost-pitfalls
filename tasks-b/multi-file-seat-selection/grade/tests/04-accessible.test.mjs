// Sub-problem 4: accessible seats are released to a general request only when
// no row can offer a contiguous standard run of the requested size.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice } from '../src/index.js'

const wings = () =>
  createVenue({
    rows: [{ id: 'A', count: 9, aislesAfter: [3, 6], accessible: [1, 2, 8, 9] }],
  })

const twoHalls = () =>
  createVenue({
    rows: [
      { id: 'A', count: 9, aislesAfter: [3, 6], accessible: [7, 8] },
      { id: 'B', count: 9, aislesAfter: [3, 6], accessible: [4, 5] },
    ],
  })

const centreRow = () =>
  createVenue({
    rows: [{ id: 'A', count: 9, aislesAfter: [3, 6], accessible: [4, 5, 6] }],
  })

test('an accessible request is offered accessible seats', () => {
  const office = createBoxOffice(wings())
  const result = office.requestGroup({ size: 2, needsAccessible: true }, 1000)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A1', 'A2'])
})

test('a general request is not offered accessible seats while a standard block fits', () => {
  const office = createBoxOffice(wings())
  const result = office.requestGroup({ size: 2 }, 1000)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A4', 'A5'])
})

test('a general request is offered accessible seats once standard is down to singles', () => {
  const office = createBoxOffice(wings())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5', 'A6'], ttl: 5000 }, 1000)
  const result = office.requestGroup({ size: 2 }, 1100)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A1', 'A2'])
})

test('a released request takes the best accessible block, not the first one', () => {
  const office = createBoxOffice(twoHalls())
  office.placeHold({ id: 'h-1', seats: ['A1', 'A2'], ttl: 5000 }, 1000)
  office.placeHold({ id: 'h-2', seats: ['A4', 'A5'], ttl: 5000 }, 1000)
  office.placeHold({ id: 'h-3', seats: ['B1', 'B2'], ttl: 5000 }, 1000)
  office.placeHold({ id: 'h-4', seats: ['B8', 'B9'], ttl: 5000 }, 1000)
  const result = office.requestGroup({ size: 2 }, 1100)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['B4', 'B5'])
})

test('release is judged against a run of the requested size, not any seats left', () => {
  const office = createBoxOffice(centreRow())
  office.placeHold({ id: 'h-1', seats: ['A1', 'A2'], ttl: 5000 }, 1000)
  office.placeHold({ id: 'h-2', seats: ['A8', 'A9'], ttl: 5000 }, 1000)
  const result = office.requestGroup({ size: 3 }, 1100)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A4', 'A5', 'A6'])
})
