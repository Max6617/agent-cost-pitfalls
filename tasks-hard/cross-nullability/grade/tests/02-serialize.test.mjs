// Sub-problem 2: the JSON boundary. The wire format carries all three states,
// and what comes back has to be the record that went in.
import {
  test,
} from 'node:test'
import {
  default as strict,
} from 'node:assert/strict'
import { applyPatch, deserialize, serialize } from '../src/index.js'

const assert = strict
const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key)

test('a cleared field survives the round trip as a cleared field', () => {
  const stored = { id: 'p1', name: 'Ada', phone: null }
  assert.equal(serialize(stored), '{"id":"p1","name":"Ada","phone":null}')
  const back = deserialize(serialize(stored))
  assert.equal(has(back, 'phone'), true)
  assert.equal(back.phone, null)
  assert.deepEqual(Object.keys(back).sort(), ['id', 'name', 'phone'])
})

test('a field that was never there does not appear in the text at all, and neither do its neighbours', () => {
  const text = serialize({ id: 'p1', name: 'Ada' })
  assert.equal(text, '{"id":"p1","name":"Ada"}')
  assert.deepEqual(deserialize(text), { id: 'p1', name: 'Ada' })
  const withEmpties = { id: 'p1', notes: '', tags: [], address: {}, creditLimit: 0 }
  assert.equal(serialize(withEmpties), '{"address":{},"creditLimit":0,"id":"p1","notes":"","tags":[]}')
  assert.deepEqual(deserialize(serialize(withEmpties)), withEmpties)
})

test('a patch that clears a field still clears it after a round trip', () => {
  const stored = { id: 'p1', name: 'Ada', phone: '+49 30 1234' }
  const patched = applyPatch(stored, { phone: null })
  assert.equal(has(patched, 'phone'), false)
  const back = deserialize(serialize(patched))
  assert.equal(has(back, 'phone'), false)
  assert.deepEqual(back, { id: 'p1', name: 'Ada' })
  const emptied = applyPatch(stored, { phone: '' })
  assert.equal(deserialize(serialize(emptied)).phone, '')
  assert.equal(has(deserialize(serialize(emptied)), 'phone'), true)
})
