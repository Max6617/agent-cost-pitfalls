import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const svc = () => createService({ rooms: [{ id: 'oak', type: 'lecture-hall', capacity: 20 }] })

test('cancelling a booking frees the slot', () => {
  const s = svc()
  s.book({ id: 'b-1', room: 'oak', start: 600, end: 660, attendees: 10 })
  assert.deepEqual(s.cancel('b-1'), { status: 'cancelled', id: 'b-1', promoted: [] })
  const r = s.book({ id: 'b-2', room: 'oak', start: 600, end: 660, attendees: 10 })
  assert.equal(r.status, 'booked')
})
