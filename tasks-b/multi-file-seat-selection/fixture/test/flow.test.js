import test from 'node:test'
import assert from 'node:assert/strict'
import { createVenue, createBoxOffice } from '../src/index.js'

const hall = () => createVenue({ rows: [{ id: 'A', count: 9, aislesAfter: [3, 6] }] })

test('seats under a lapsed hold are bookable again', () => {
  const office = createBoxOffice(hall())
  office.placeHold({ id: 'h-1', seats: ['A4', 'A5'], ttl: 20 }, 500)
  const result = office.requestGroup({ size: 2 }, 520)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.seats, ['A4', 'A5'])
})
