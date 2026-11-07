// Sub-problem 4: the values a configuration carries that are not records.
import test from 'node:test'
import assert from 'node:assert/strict'
import { merge, deepEqual } from '../src/index.js'

class Window {
  constructor(size, label) {
    this.size = size
    this.label = label
  }
  contains(n) { return n < this.size }
}

test('a non-plain value inside a replaced array is passed through, and the array is not shared', () => {
  const scheduled = new Date(1700000000000)
  const window = new Window(10, 'per-ip')
  const source = { jobs: [scheduled, { name: 'nightly' }], window }

  const out = merge({ jobs: [{ name: 'hourly' }] }, source)

  assert.notEqual(out.jobs, source.jobs, 'the replacement is a fresh array')
  assert.equal(out.jobs.length, 2)
  assert.equal(out.jobs[0], scheduled, 'the date inside it is the same object')
  assert.deepEqual(out.jobs[1], { name: 'nightly' })
  assert.equal(out.window, window, 'the instance is the object the source holds')

  out.jobs.push({ name: 'extra' })
  assert.equal(source.jobs.length, 2, 'the source array is untouched')
})

test('a class instance and a map keep their identity while a record is copied', () => {
  const window = new Window(10, 'per-ip')
  const table = new Map([['a', 1]])
  const base = { window, table, nested: { deep: { n: 1 } } }

  const copy = merge(base, {})

  assert.equal(copy.window, window, 'the instance is the object the source holds')
  assert.equal(copy.table, table, 'the map is the object the source holds')
  assert.notEqual(copy.nested, base.nested)
})

test('NaN equals itself, and dates are compared by the instant they hold', () => {
  assert.equal(deepEqual({ n: Number.NaN }, { n: Number.NaN }), true)
  assert.equal(deepEqual({ at: new Date(1000) }, { at: new Date(1000) }), true)
  assert.equal(deepEqual({ at: new Date(1000) }, { at: new Date(1001) }), false)
})
