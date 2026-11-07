import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('join reports a 1-based position', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  assert.deepEqual(svc.join('amy', 'standard', 1), { status: 'joined', position: 1 })
  assert.deepEqual(svc.join('bob', 'standard', 2), { status: 'joined', position: 2 })
})

test('priority members go ahead of standard members who joined earlier', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  assert.equal(svc.positionOf('pat'), 1)
  assert.equal(svc.positionOf('amy'), 2)
})

test('joining twice is a duplicate and changes nothing', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('amy', 'standard', 1)
  svc.join('bob', 'standard', 2)
  assert.deepEqual(svc.join('amy', 'standard', 3), { status: 'duplicate', position: 1 })
  assert.equal(svc.positionOf('bob'), 2)
})
