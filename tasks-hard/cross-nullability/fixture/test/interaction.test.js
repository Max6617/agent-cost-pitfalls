// Reproductions from the customer-service backlog. Each one is a ticket we
// could pin down; docs/field-policy.md is the contract behind them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDiff, auditEntries, diffRecords, exportCsv, search, serialize } from '../src/index.js'

test('a cleared profile that arrives over the wire is not read back as a value', () => {
  const stored = { id: 'p1', name: 'Ada', phone: null }
  assert.equal(serialize(stored), '{"id":"p1","name":"Ada","phone":null}')
  const back = JSON.parse(serialize(stored))
  assert.equal(Object.prototype.hasOwnProperty.call(back, 'phone'), true)
  assert.equal(back.phone, null)
  const plain = { id: 'p1', name: 'Ada' }
  assert.deepEqual(Object.keys(JSON.parse(serialize(plain))).sort(), ['id', 'name'])
})

test('the diff tells a removed field apart from a field that was set to null', () => {
  const before = { id: 'p1', phone: '+49 30 1234', notes: 'ring back' }
  const after = { id: 'p1', phone: null }
  const diff = diffRecords(before, after)
  assert.deepEqual(diff.unset, ['notes'])
  assert.equal(diff.set.phone, null)
  assert.deepEqual(applyDiff(before, diff), after)
})

test('a search for a cleared field does not match a customer who still has a value', () => {
  const rows = [
    { id: 'p1', phone: null },
    { id: 'p2', phone: '+49 30 1234' },
    { id: 'p3' },
  ]
  assert.deepEqual(search(rows, [{ field: 'phone', op: 'no value' }]).map((r) => r.id), ['p1', 'p3'])
  assert.deepEqual(search(rows, [{ field: 'phone', op: '=', value: null }]).map((r) => r.id), ['p1'])
})

test('the export keeps a cleared field apart from an empty one', () => {
  const csv = exportCsv([
    { id: 'p1', phone: null },
    { id: 'p2', phone: '' },
  ])
  const lines = csv.trimEnd().split('\n')
  assert.equal(lines[0], 'id,phone')
  assert.equal(lines[1], 'p1,null')
  assert.equal(lines[2], 'p2,""')
})

test('the audit trail records a cleared field as cleared', () => {
  const before = { id: 'p1', phone: '+49 30 1234', notes: 'ring back' }
  const after = { id: 'p1', notes: 'ring back' }
  const entries = auditEntries(before, after)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].field, 'phone')
  assert.equal(entries[0].from, '+49 30 1234')
  assert.equal(entries[0].to, null)
})
