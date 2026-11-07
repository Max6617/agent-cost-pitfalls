import test from 'node:test'
import assert from 'node:assert/strict'
import { merge, clone } from '../src/index.js'

test('nested objects merge and neither input changes', () => {
  const base = { name: 'checkout', listen: { host: '127.0.0.1', port: 80 }, tags: ['a'] }
  const override = { listen: { port: 8080 } }
  const frozenBase = clone(base)

  const out = merge(base, override)

  assert.deepEqual(out, {
    name: 'checkout',
    listen: { host: '127.0.0.1', port: 8080 },
    tags: ['a'],
  })
  assert.deepEqual(base, frozenBase, 'merge must not change the target')
  assert.deepEqual(override, { listen: { port: 8080 } }, 'merge must not change the source')
})

test('an array in an override replaces the upstream list', () => {
  const out = merge({ upstreams: ['payments', 'inventory'] }, { upstreams: ['payments-eu'] })
  assert.deepEqual(out.upstreams, ['payments-eu'])
})

test('null is a value and overwrites the whole subtree', () => {
  const out = merge({ limits: { cpu: 1, memory: 2 } }, { limits: null })
  assert.equal(out.limits, null)
})
