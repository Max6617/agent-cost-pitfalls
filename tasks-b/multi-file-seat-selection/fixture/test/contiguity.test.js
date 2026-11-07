import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice, isContiguous } from '../src/index.js'

const hall = () => createVenue({ rows: [{ id: 'A', count: 9, aislesAfter: [3, 6] }] })

test('seats split by an aisle are not a contiguous block', () => {
  const row = hall().rows[0]
  assert.equal(isContiguous(row, [3, 4]), false)
  assert.equal(isContiguous(row, [6, 7]), false)
  assert.equal(isContiguous(row, [4, 5, 6]), true)
})

test('a hold naming seats across an aisle is refused', () => {
  const office = createBoxOffice(hall())
  const result = office.placeHold({ id: 'h-1', seats: ['A3', 'A4'], ttl: 30 }, 1000)
  assert.equal(result.status, 'not-contiguous')
  assert.deepEqual([...office.blockedSeats(1000)], [])
})
