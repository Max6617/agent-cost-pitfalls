import test from 'node:test'
import assert from 'node:assert/strict'
import { merge, patch, hasOwn } from '../src/index.js'

test('a patch adds and overrides keys and leaves the base alone', () => {
  const base = { listen: { port: 80 }, features: { newCart: true } }
  const frozenBase = JSON.parse(JSON.stringify(base))

  const out = patch(base, { listen: { host: '0.0.0.0' }, features: { giftWrap: true } })

  assert.deepEqual(out, {
    listen: { port: 80, host: '0.0.0.0' },
    features: { newCart: true, giftWrap: true },
  })
  assert.deepEqual(base, frozenBase, 'patch must not change the base')
})

test('a key named __proto__ is data, not an escape hatch', () => {
  const out = merge({}, JSON.parse('{"__proto__": {"merged": true}}'))

  assert.ok(hasOwn(out, '__proto__'), 'the key is present on the result')
  assert.equal(out.merged, undefined, 'the key must not reach a prototype')
})

test('a chain of overrides produces a config that points at itself exactly once', () => {
  const source = { service: 'checkout' }
  source.parent = source

  const out = merge({ region: 'eu' }, source)

  assert.equal(out.region, 'eu')
  assert.equal(out.service, 'checkout')
  assert.equal(out.parent === out, true, 'the cycle survives the merge')
})
