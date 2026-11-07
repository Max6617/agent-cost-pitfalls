// Sub-problem: the subscriptions board accepts legacy spellings on read.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createSubscriptions } from '../src/index.js'

test('a legacy spelling is accepted when a subscription is added', () => {
  const subs = createSubscriptions()
  subs.add({ id: 's-1', status: 'new' })
  assert.equal(subs.get('s-1').status, 'open')
})

test('a legacy transition target is accepted', () => {
  const subs = createSubscriptions()
  subs.add({ id: 's-1' })
  subs.transition('s-1', 'triaged')
  subs.transition('s-1', 'in-progress')
  subs.transition('s-1', 'done')
  assert.equal(subs.get('s-1').status, 'resolved')
})

test('a status filter accepts a legacy spelling', () => {
  const subs = createSubscriptions()
  subs.add({ id: 's-1', status: 'resolved' })
  subs.add({ id: 's-2', status: 'open' })
  const found = subs.list({ status: 'done' }).map((r) => r.id)
  assert.deepEqual(found, ['s-1'])
})

test('a spelling nobody knows is still refused', () => {
  const subs = createSubscriptions()
  assert.throws(
    () => subs.add({ id: 's-1', status: 'bogus' }),
    (err) => {
      assert.equal(err.name, 'UnknownStatusError')
      assert.equal(err.code, 'unknown-status')
      assert.equal(err.status, 'bogus')
      return true
    },
  )
})
