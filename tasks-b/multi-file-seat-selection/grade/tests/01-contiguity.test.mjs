// Sub-problem 1: what contiguity means on a seat map with aisles - blocks and
// holds must respect the gaps, however consecutive the seat numbers look.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice, isContiguous } from '../src/index.js'

const oneRow = () => createVenue({ rows: [{ id: 'A', count: 9, aislesAfter: [3, 6] }] })

test('a run inside one section of the row is contiguous', () => {
  const row = oneRow().rows[0]
  assert.equal(isContiguous(row, [4, 5, 6]), true)
  assert.equal(isContiguous(row, [1, 2, 3]), true)
  assert.equal(isContiguous(row, [5]), true)
})

test('consecutive numbers across an aisle are not contiguous', () => {
  const row = oneRow().rows[0]
  assert.equal(isContiguous(row, [3, 4]), false)
  assert.equal(isContiguous(row, [6, 7]), false)
  assert.equal(isContiguous(row, [2, 3, 4]), false)
})

test('no block of four exists when every section seats three', () => {
  const office = createBoxOffice(oneRow())
  const result = office.requestGroup({ size: 4 }, 1000)
  assert.equal(result.status, 'no-availability')
})

test('a hold naming seats across an aisle is refused', () => {
  const office = createBoxOffice(oneRow())
  const result = office.placeHold({ id: 'h-1', seats: ['A3', 'A4'], ttl: 30 }, 1000)
  assert.equal(result.status, 'not-contiguous')
  assert.deepEqual([...office.blockedSeats(1000)], [])
})
