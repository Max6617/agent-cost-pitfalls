// Sub-problem 1: the patch and merge operations. What a key of a patch means,
// what a merge does with a source that is absent versus a source that is null,
// and the fields a patch is reported as changing.
import {
  test,
} from 'node:test'
import {
  default as strict,
} from 'node:assert/strict'
import {
  applyPatch, changedFields, createProfile, fieldState, mergePatch, replaceProfile, resetProfiles,
} from '../src/index.js'

const assert = strict
const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key)

test('a patch cannot reach a field it does not name', () => {
  const record = { id: 'p1', name: 'Ada', phone: '+49 30 1234', notes: 'ring back' }
  const patched = applyPatch(record, { name: 'Ada Lovelace' })
  assert.deepEqual(patched, { id: 'p1', name: 'Ada Lovelace', phone: '+49 30 1234', notes: 'ring back' })
  assert.equal(has(patched, 'phone'), true)
})

test('null clears a field, an empty value writes one, and neither reaches the keys beside them', () => {
  const record = { id: 'p1', phone: '+49 30 1234', notes: 'ring back' }
  const cleared = applyPatch(record, { phone: null })
  assert.deepEqual(cleared, { id: 'p1', notes: 'ring back' })
  assert.equal(fieldState(cleared, 'phone'), 'absent')
  const emptied = applyPatch(record, { notes: '', tags: [], address: {} })
  assert.deepEqual(emptied, { id: 'p1', phone: '+49 30 1234', notes: '', tags: [], address: {} })
  assert.equal(fieldState(emptied, 'notes'), 'empty')
  assert.equal(applyPatch(record, { notes: '' }).phone, '+49 30 1234')
  assert.deepEqual(changedFields(record, { name: 'Ada Lovelace' }), ['name'])
  assert.deepEqual(changedFields(record, { phone: null, name: 'Ada Lovelace' }), ['name', 'phone'])
  assert.deepEqual(changedFields(record, { phone: null }), ['phone'])
  assert.deepEqual(changedFields(record, { note: null }), [])
  assert.deepEqual(changedFields({ id: 'p1' }, { nickname: null }), [])
  assert.deepEqual(changedFields(record, { phone: null, notes: '' }), ['notes', 'phone'])
})

test('patching into a nested record leaves the keys the patch does not mention', () => {
  const record = { id: 'p1', address: { city: 'Berlin', zip: '10115', country: 'DE' } }
  const patched = applyPatch(record, { address: { zip: null, country: 'AT' } })
  assert.deepEqual(patched, { id: 'p1', address: { city: 'Berlin', country: 'AT' } })
})

test('a merge with no source is not a merge that clears the record', () => {
  const record = { id: 'p1', phone: null, notes: '' }
  assert.deepEqual(mergePatch(record), { id: 'p1', phone: null, notes: '' })
  assert.deepEqual(mergePatch(record, {}), { id: 'p1', phone: null, notes: '' })
  assert.deepEqual(mergePatch(record, { name: 'Ada' }), { id: 'p1', phone: null, notes: '', name: 'Ada' })
  assert.deepEqual(mergePatch(record, null), {})
  resetProfiles()
  createProfile({ id: 'p1', name: 'Ada', phone: null })
  assert.deepEqual(replaceProfile('p1', null), {})
})
