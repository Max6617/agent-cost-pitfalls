// Sub-problem 1: the order of the line - tier before arrival order, and the
// queue operations (duplicate joins, leave + rejoin) that must respect it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

test('priority members are placed ahead of standard members who joined earlier', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  assert.equal(svc.positionOf('pat'), 1)
  assert.equal(svc.positionOf('amy'), 2)
})

test('within the priority tier the earlier joiner is ahead', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('pat', 'priority', 1)
  svc.join('pip', 'priority', 2)
  svc.join('pol', 'priority', 3)
  assert.equal(svc.positionOf('pat'), 1)
  assert.equal(svc.positionOf('pip'), 2)
  assert.equal(svc.positionOf('pol'), 3)
})

test('a full interleaving orders tier first, then arrival', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  svc.join('bob', 'standard', 3)
  svc.join('pip', 'priority', 4)
  svc.join('cyd', 'standard', 5)
  assert.deepEqual(
    ['pat', 'pip', 'amy', 'bob', 'cyd'].map((m) => svc.positionOf(m)),
    [1, 2, 3, 4, 5],
  )
})

test('rejoining after a leave keeps the tier place of the member', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  assert.deepEqual(svc.leave('pat', 3), { status: 'left' })
  assert.equal(svc.positionOf('pat'), null)
  assert.deepEqual(svc.join('pat', 'priority', 4), { status: 'joined', position: 1 })
  assert.equal(svc.positionOf('amy'), 2)
})

test('a duplicate join keeps the original position and reports duplicate', () => {
  const svc = createService({ capacity: 1, offerTtl: 50 })
  svc.join('amy', 'standard', 1)
  svc.join('pat', 'priority', 2)
  svc.join('bob', 'standard', 3)
  assert.deepEqual(svc.join('pat', 'priority', 4), { status: 'duplicate', position: 1 })
  assert.deepEqual(
    ['pat', 'amy', 'bob'].map((m) => svc.positionOf(m)),
    [1, 2, 3],
  )
})
