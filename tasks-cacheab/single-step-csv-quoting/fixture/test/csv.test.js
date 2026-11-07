import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, toCsv, quoteField, parseRecords } from '../src/csv.js'

test('splits a plain row', () => {
  assert.deepEqual(parseCsv('a,b,c'), [['a', 'b', 'c']])
})

test('splits rows on newlines', () => {
  assert.deepEqual(parseCsv('a,b\nc,d'), [
    ['a', 'b'],
    ['c', 'd'],
  ])
})

test('accepts a trailing newline without inventing an empty row', () => {
  assert.deepEqual(parseCsv('a,b\n'), [['a', 'b']])
})

test('normalises CRLF', () => {
  assert.deepEqual(parseCsv('a,b\r\nc,d'), [
    ['a', 'b'],
    ['c', 'd'],
  ])
})

test('a quoted field may contain a comma', () => {
  assert.deepEqual(parseCsv('a,"b,c",d'), [['a', 'b,c', 'd']])
})

test('a quoted field may contain a newline', () => {
  assert.deepEqual(parseCsv('a,"line1\nline2",c'), [['a', 'line1\nline2', 'c']])
})

test('a doubled quote inside a quoted field is one literal quote', () => {
  assert.deepEqual(parseCsv('a,"say ""hi""",c'), [['a', 'say "hi"', 'c']])
})

test('a field that is only a quoted quote', () => {
  assert.deepEqual(parseCsv('""""'), [['"']])
})

test('empty fields are preserved', () => {
  assert.deepEqual(parseCsv('a,,c'), [['a', '', 'c']])
  assert.deepEqual(parseCsv(',,'), [['', '', '']])
})

test('quotes are kept only where they are quoting', () => {
  assert.deepEqual(parseCsv('a,b"c,d'), [['a', 'b"c', 'd']])
})

test('quotes a field only when it has to', () => {
  assert.equal(quoteField('plain'), 'plain')
  assert.equal(quoteField('has,comma'), '"has,comma"')
})

test('a doubled quote survives a round trip', () => {
  const rows = [['a', 'say "hi"', 'x,y'], ['1', '2', '3']]
  assert.deepEqual(parseCsv(toCsv(rows)), rows)
})

test('a newline inside a field survives a round trip', () => {
  const rows = [['a', 'line1\nline2']]
  assert.deepEqual(parseCsv(toCsv(rows)), rows)
})

test('records are keyed by the header row', () => {
  const records = parseRecords('sku,qty\nTEA-01,2\nMUG-04,1\n')
  assert.deepEqual(records, [
    { sku: 'TEA-01', qty: '2' },
    { sku: 'MUG-04', qty: '1' },
  ])
})

test('a short row leaves the missing columns empty', () => {
  assert.deepEqual(parseRecords('a,b\n1\n'), [{ a: '1', b: '' }])
})
