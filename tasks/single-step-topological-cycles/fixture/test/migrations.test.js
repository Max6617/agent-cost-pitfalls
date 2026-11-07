import test from 'node:test'
import assert from 'node:assert/strict'
import { order, mustOrder, isolated } from '../src/migrations.js'

/** Position of an id in the order. */
const at = (list, id) => list.indexOf(id)

test('independent steps keep their declaration order', () => {
  const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(mustOrder(steps), ['a', 'b', 'c'])
})

test('a step waits for what it lists', () => {
  const steps = [{ id: 'b', after: ['a'] }, { id: 'a' }]
  assert.deepEqual(mustOrder(steps), ['a', 'b'])
})

test('a chain runs in order', () => {
  const steps = [{ id: 'c', after: ['b'] }, { id: 'b', after: ['a'] }, { id: 'a' }]
  assert.deepEqual(mustOrder(steps), ['a', 'b', 'c'])
})

test('every dependency is satisfied', () => {
  const steps = [
    { id: 'd', after: ['b', 'c'] },
    { id: 'c', after: ['a'] },
    { id: 'b', after: ['a'] },
    { id: 'a' },
  ]
  const result = mustOrder(steps)
  for (const step of steps) {
    for (const need of step.after ?? []) assert.ok(at(result, need) < at(result, step.id))
  }
})

test('every step appears exactly once', () => {
  const steps = [{ id: 'd', after: ['b'] }, { id: 'b' }, { id: 'c' }, { id: 'a', after: ['c'] }]
  const result = mustOrder(steps)
  assert.equal(result.length, steps.length)
  assert.equal(new Set(result).size, steps.length)
})

test('ties are broken by declaration order, not by dependency shape', () => {
  const steps = [
    { id: 'x' },
    { id: 'y', after: ['z'] },
    { id: 'z' },
  ]
  assert.deepEqual(mustOrder(steps), ['x', 'z', 'y'])
})

test('the order is stable across runs', () => {
  const steps = [{ id: 'b', after: ['a'] }, { id: 'a' }, { id: 'c' }]
  assert.deepEqual(mustOrder(steps), mustOrder(steps))
})

test('a two-step cycle is reported with both steps', () => {
  const result = order([{ id: 'a', after: ['b'] }, { id: 'b', after: ['a'] }])
  assert.deepEqual(result.cycle.sort(), ['a', 'b'])
  assert.throws(() => mustOrder([{ id: 'a', after: ['b'] }, { id: 'b', after: ['a'] }]), /cycle: /)
})

test('a longer cycle is reported too', () => {
  const steps = [{ id: 'a', after: ['c'] }, { id: 'b', after: ['a'] }, { id: 'c', after: ['b'] }]
  assert.equal(order(steps).cycle.length, 3)
})

test('a step that depends on itself is a cycle', () => {
  assert.deepEqual(order([{ id: 'a', after: ['a'] }]).cycle, ['a'])
})

test('steps outside a cycle still get ordered', () => {
  const result = order([{ id: 'ok' }, { id: 'a', after: ['b'] }, { id: 'b', after: ['a'] }])
  assert.deepEqual(result.order, ['ok'])
  assert.deepEqual(result.cycle.sort(), ['a', 'b'])
})

test('an unknown dependency stops the plan', () => {
  const result = order([{ id: 'a', after: ['ghost'] }])
  assert.deepEqual(result.unknown, [{ step: 'a', after: 'ghost' }])
  assert.throws(() => mustOrder([{ id: 'a', after: ['ghost'] }]), /ghost/)
})

test('a step with an unknown dependency is left out of the order', () => {
  const result = order([{ id: 'bad', after: ['ghost'] }, { id: 'good' }])
  assert.deepEqual(result.order, ['good'])
})

test('nothing to do is an empty order', () => {
  assert.deepEqual(mustOrder([]), [])
})

test('the leaves are the steps that depend on nothing', () => {
  const steps = [{ id: 'a' }, { id: 'b', after: ['a'] }, { id: 'c' }]
  assert.deepEqual(isolated(steps), ['a', 'c'])
})
