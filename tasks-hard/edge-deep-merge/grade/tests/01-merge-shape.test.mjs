// Sub-problem 1: nested merge, arrays as values, and sources applied in order.
import test from 'node:test'
import assert from 'node:assert/strict'
import { merge } from '../src/index.js'

test('a nested array next to other keys still replaces, and is not shared afterwards', () => {
  const target = { service: 'checkout', stages: ['build'] }
  const source = { service: 'checkout', stages: [{ name: 'build', limit: 2 }] }

  const out = merge(target, source)
  assert.deepEqual(out.stages, [{ name: 'build', limit: 2 }])
  assert.equal(out.service, 'checkout')

  out.stages.push({ name: 'test' })
  assert.deepEqual(source.stages, [{ name: 'build', limit: 2 }], 'the source array is not extended')
  assert.deepEqual(target.stages, ['build'])
})

test('a nested array replaces, and the copy does not alias the config it came from', () => {
  const target = { stages: [{ name: 'test' }] }
  const source = { stages: [{ name: 'build', limit: 2 }] }

  const out = merge(target, source)
  assert.deepEqual(out.stages, [{ name: 'build', limit: 2 }])

  out.stages[0].limit = 9
  assert.deepEqual(source.stages, [{ name: 'build', limit: 2 }], 'the source is untouched')
  assert.deepEqual(target.stages, [{ name: 'test' }])
})

test('merging a source that points at itself produces a structure that points at itself', () => {
  const source = { name: 'node' }
  source.parent = source

  const out = merge({ marker: true }, source)

  assert.equal(out.marker, true)
  assert.equal(out.name, 'node')
  assert.equal(out.parent === out, true, 'the cycle is a cycle in the result')
  assert.deepEqual(Object.keys(out).sort(), ['marker', 'name', 'parent'])
})

