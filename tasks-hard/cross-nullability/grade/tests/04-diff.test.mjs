// Sub-problem 4: the diff generator. A key the edit removed and a key the edit
// set to null are two different edits, and applying the patch has to reproduce
// the record on the other side either way.
import {
  test,
} from 'node:test'
import {
  default as strict,
} from 'node:assert/strict'
import { applyDiff, describeDiff, diffRecords, isEmptyDiff } from '../src/index.js'

const assert = strict
const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key)

test('a removed field is unset and a field set to null is set', () => {
  const before = { id: 'p1', phone: '+49 30 1234', notes: 'ring back' }
  const after = { id: 'p1', phone: null }
  const diff = diffRecords(before, after)
  assert.deepEqual(diff.unset, ['notes'])
  assert.equal(has(diff.set, 'phone'), true)
  assert.equal(diff.set.phone, null)
  const rebuilt = applyDiff(before, diff)
  assert.deepEqual(rebuilt, after)
  assert.equal(has(rebuilt, 'phone'), true)
  const removal = diffRecords({ id: 'p1', phone: null }, { id: 'p1' })
  assert.deepEqual(removal.unset, ['phone'])
  assert.deepEqual(applyDiff({ id: 'p1', phone: null }, removal), { id: 'p1' })
  assert.deepEqual(diffRecords({ id: 'p1' }, { id: 'p1', phone: '+49 30 1234' }).set, { phone: '+49 30 1234' })
})

test('a change to an empty value is a change worth recording', () => {
  const before = { id: 'p1', notes: 'ring back' }
  const diff = diffRecords(before, { id: 'p1', notes: '' })
  assert.deepEqual(diff.set, { notes: '' })
  assert.deepEqual(diff.unset, [])
  assert.deepEqual(applyDiff(before, diff), { id: 'p1', notes: '' })
  assert.equal(isEmptyDiff(diff), false)
  assert.equal(isEmptyDiff(diffRecords({ id: 'p1', phone: null }, { id: 'p1', phone: null })), true)
})

test('a cleared nested field is not a removed one, and the patch reproduces the record', () => {
  const before = { id: 'p1', address: { city: 'Berlin', zip: '10115' } }
  const after = { id: 'p1', address: { city: 'Berlin', zip: null } }
  const diff = diffRecords(before, after)
  assert.deepEqual(diff.unset, [])
  assert.equal(diff.set.address.set.zip, null)
  assert.deepEqual(applyDiff(before, diff), after)
  const dropped = diffRecords({ id: 'p1', address: { city: 'Berlin' } }, { id: 'p1', address: {} })
  assert.deepEqual(dropped.unset, [])
  assert.deepEqual(dropped.set.address.unset, ['city'])
  assert.deepEqual(applyDiff({ id: 'p1', address: { city: 'Berlin' } }, dropped), { id: 'p1', address: {} })
  assert.equal(isEmptyDiff(diffRecords(before, before)), true)
})

test('the description of an edit keeps a clear apart from a field that was never set', () => {
  const described = describeDiff(
    { id: 'p1', phone: '+49 30 1234', notes: 'ring back' },
    { id: 'p1', phone: null, notes: '', creditLimit: 500 },
  )
  assert.deepEqual(described.phone, { from: '+49 30 1234', to: null })
  assert.deepEqual(described.notes, { from: 'ring back', to: '' })
  assert.equal(has(described.creditLimit, 'from'), false)
  assert.equal(described.creditLimit.to, 500)
  assert.equal(has(described, 'id'), false)
  const cleared = describeDiff({ id: 'p1', creditLimit: 500 }, { id: 'p1', creditLimit: null })
  assert.deepEqual(cleared.creditLimit, { from: 500, to: null })
  const dropped = describeDiff({ id: 'p1', notes: 'ring back' }, { id: 'p1' })
  assert.deepEqual(dropped.notes, { from: 'ring back', to: null })
})
