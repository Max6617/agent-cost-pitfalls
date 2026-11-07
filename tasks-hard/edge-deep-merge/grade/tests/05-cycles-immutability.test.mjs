// Sub-problem 5: structures that point at themselves, and inputs that must not
// move.
import test from 'node:test'
import assert from 'node:assert/strict'
import { merge } from '../src/index.js'

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

test('merging does not mutate either input, at any depth', () => {
  const target = { keep: 'x', nested: { one: 1, list: [{ id: 1 }] } }
  const source = { nested: { one: 2, extra: true }, list: [{ id: 'b' }] }

  const out = merge(target, source)
  out.keep = 'changed'
  out.nested.list[0].id = 99
  out.list.push({ id: 'c' })

  assert.deepEqual(target, { keep: 'x', nested: { one: 1, list: [{ id: 1 }] } })
  assert.deepEqual(source, { nested: { one: 2, extra: true }, list: [{ id: 'b' }] })
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

test('a cyclic source that also carries a __proto__ key merges without hanging or polluting', () => {
  const source = { name: 'node' }
  source.parent = source
  Object.defineProperty(source, '__proto__', {
    value: { polluted: true },
    writable: true,
    enumerable: true,
    configurable: true,
  })

  const out = merge({ marker: true }, source)

  assert.equal(own(out, '__proto__'), true, 'the hazardous key is data')
  assert.equal(out.polluted, undefined, 'the hazardous key reached no prototype')
  assert.equal(out.name, 'node')
  assert.equal(out.parent === out, true, 'the cycle is a cycle in the result')
  assert.equal(Object.getPrototypeOf(out), Object.prototype)
})
