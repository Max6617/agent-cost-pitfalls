// Sub-problem 5: the rules in combination - holds, expiry, aisles, scoring and
// accessible release deciding one request at a time.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice } from '../src/index.js'

const oneRow = () => createVenue({ rows: [{ id: 'A', count: 9, aislesAfter: [3, 6] }] })

const twoRows = () =>
  createVenue({
    rows: [
      { id: 'A', count: 9, aislesAfter: [3, 6] },
      { id: 'B', count: 9, aislesAfter: [3, 6] },
    ],
  })

const wings = () =>
  createVenue({
    rows: [{ id: 'A', count: 9, aislesAfter: [3, 6], accessible: [1, 2, 8, 9] }],
  })

test('a hold on the front-centre pair moves the offer to centred seats further back', () => {
  const office = createBoxOffice(twoRows())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 5000 }, 1000)
  const result = office.requestGroup({ size: 2 }, 1000)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['B4', 'B5'])
})

test('only the lapsed hold frees its seats; the longer hold still blocks', () => {
  const office = createBoxOffice(oneRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  office.placeHold({ id: 'h-2', seats: ['A7', 'A8'], ttl: 90 }, 1000)
  const result = office.requestGroup({ size: 2 }, 1030)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A4', 'A5'])
})

test('a run of standard seats split by an aisle does not count as availability', () => {
  const office = createBoxOffice(wings())
  const result = office.requestGroup({ size: 4 }, 1000)
  assert.equal(result.status, 'no-availability')
})

test('seats re-held the moment a hold lapses are blocked for the next request', () => {
  const office = createBoxOffice(oneRow())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 30 }, 1000)
  const again = office.placeHold({ id: 'h-2', seats: ['A4', 'A5'], ttl: 60 }, 1030)
  assert.equal(again.status, 'ok')
  const result = office.requestGroup({ size: 2 }, 1035)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A2', 'A3'])
})

test('an accessible request sees the spaces whose hold has just lapsed', () => {
  const office = createBoxOffice(wings())
  office.placeHold({ id: 'h-1', seats: ['A1', 'A2'], ttl: 30 }, 1000)
  const result = office.requestGroup({ size: 2, needsAccessible: true }, 1030)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A1', 'A2'])
})
