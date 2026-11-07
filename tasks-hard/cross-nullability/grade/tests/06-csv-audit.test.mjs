// Sub-problem 6: the CSV export, the CSV reader and the audit trail. Two
// projections of the same records, both of which have to keep a cleared field
// and a field that was never set apart in the text they write.
import {
  test,
} from 'node:test'
import {
  default as strict,
} from 'node:assert/strict'
import {
  auditEntries, columnFill, exportColumns, exportCsv, formatEntry, importCsv,
} from '../src/index.js'

const assert = strict
const has = (record, key) => Object.prototype.hasOwnProperty.call(record, key)
const lines = (csv) => csv.trimEnd().split('\n')

test('a column appears when one row has the field, and the rows that do not leave it blank', () => {
  assert.deepEqual(lines(exportCsv([
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Grace' },
  ])), ['id,name', 'p1,Ada', 'p2,Grace'])
  assert.deepEqual(exportColumns([{ id: 'p1', tags: [], address: {}, creditLimit: 0 }]), ['address', 'creditLimit', 'id', 'tags'])
  const rows = [
    { id: 'p1', name: 'Ada', phone: null },
    { id: 'p2', name: 'Grace', phone: '+1 202 555' },
    { id: 'p3', name: 'Alan' },
  ]
  assert.deepEqual(lines(exportCsv(rows)), ['id,name,phone', 'p1,Ada,null', 'p2,Grace,+1 202 555', 'p3,Alan,'])
  assert.equal(exportCsv(rows).includes('company'), false)
})

test('a cleared field and an empty field do not come out looking the same', () => {
  const csv = exportCsv([
    { id: 'p1', notes: null },
    { id: 'p2', notes: '' },
    { id: 'p3', notes: 'ring back' },
  ])
  assert.deepEqual(lines(csv), ['id,notes', 'p1,null', 'p2,""', 'p3,ring back'])
  assert.deepEqual(lines(exportCsv([{ id: 'p4', address: {} }])), ['address,id', '{},p4'])
  assert.deepEqual(lines(exportCsv([{ id: 'p5', notes: null, email: 'ada@example.com' }])), ['email,id,notes', 'ada@example.com,p5,null'])
})

test('importing an export gives the text back, empty cells and all', () => {
  const rows = [
    { id: 'p1', phone: null },
    { id: 'p2', phone: '' },
    { id: 'p3' },
  ]
  assert.deepEqual(lines(exportCsv(rows)), ['id,phone', 'p1,null', 'p2,""', 'p3,'])
  const back = importCsv(exportCsv(rows))
  assert.deepEqual(back, [
    { id: 'p1', phone: 'null' },
    { id: 'p2', phone: '' },
    { id: 'p3', phone: '' },
  ])
  assert.equal(back[0].phone, 'null')
  assert.deepEqual(columnFill(rows, 'phone'), 0)
  assert.deepEqual(columnFill([{ phone: 'null' }], 'phone'), 1)
})

test('the audit trail writes a clear as a clear and a removal as unset', () => {
  const entries = auditEntries(
    { id: 'p1', phone: '+49 30 1234', notes: null },
    { id: 'p1', notes: '' },
  )
  assert.deepEqual(entries.map((entry) => entry.field), ['notes', 'phone'])
  const [notes, phone] = entries
  assert.equal(has(notes, 'from'), true)
  assert.equal(notes.from, null)
  assert.equal(notes.to, '')
  assert.equal(phone.from, '+49 30 1234')
  assert.equal(phone.to, null)
  const fresh = auditEntries({ id: 'p1' }, { id: 'p1', notes: 'ring back' })
  assert.equal(fresh.length, 1)
  assert.equal(fresh[0].from, undefined)
  assert.equal(fresh[0].to, 'ring back')
  const cleared = auditEntries({ id: 'p1', phone: '+49 30 1234' }, { id: 'p1', phone: null })
  assert.equal(cleared.length, 1)
  assert.equal(cleared[0].to, null)
  assert.equal(formatEntry(cleared[0]), 'phone: +49 30 1234 -> null')
  assert.equal(formatEntry({ field: 'notes', from: undefined, to: 'ring back' }), 'notes: unset -> ring back')
  assert.equal(formatEntry({ field: 'notes', from: null, to: '' }), 'notes: null -> ""')
})
