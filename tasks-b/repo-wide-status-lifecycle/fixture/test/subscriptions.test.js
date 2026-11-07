import test from 'node:test'
import assert from 'node:assert/strict'
import { createSubscriptions } from '../src/index.js'

test('a subscription can be added under a legacy spelling', () => {
  const subs = createSubscriptions()
  subs.add({ id: 's-1', status: 'new' })
  assert.equal(subs.get('s-1').status, 'open')
})

test('a transition target may use a legacy spelling', () => {
  const subs = createSubscriptions()
  subs.add({ id: 's-1' })
  subs.transition('s-1', 'triaged')
  subs.transition('s-1', 'in-progress')
  subs.transition('s-1', 'done')
  assert.equal(subs.get('s-1').status, 'resolved')
})
