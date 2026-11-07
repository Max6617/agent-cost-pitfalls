// Reproductions from the customer-service backlog. Each one is a ticket we
// could pin down; docs/field-policy.md is the contract behind them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyPatch, mergePatch } from '../src/index.js'

const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key)

test('a patch that does not mention a field leaves it alone', () => {
  const record = { id: 'p1', name: 'Ada', phone: '+49 30 1234' }
  const patched = applyPatch(record, { name: 'Ada Lovelace' })
  assert.equal(patched.phone, '+49 30 1234')
  assert.equal(patched.name, 'Ada Lovelace')
})

test('a patch that carries null clears the field instead of storing it', () => {
  const record = { id: 'p1', name: 'Ada', phone: '+49 30 1234' }
  const patched = applyPatch(record, { phone: null })
  assert.equal(has(patched, 'phone'), false)
  assert.equal(patched.name, 'Ada')
})

test('an empty string written by a patch is a value, not a clear', () => {
  const patched = applyPatch({ id: 'p1', notes: 'ring back' }, { notes: '' })
  assert.equal(has(patched, 'notes'), true)
  assert.equal(patched.notes, '')
})

test('an update that clears everything is not the same call as no update at all', () => {
  const record = { id: 'p1', name: 'Ada' }
  assert.deepEqual(mergePatch(record, null), {})
  assert.deepEqual(mergePatch(record), { id: 'p1', name: 'Ada' })
})
