// Line endings and the byte-order mark - docs/dialect-spec.md, §2 and §10.2.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

const rows = (text, options = {}) => parse(text, { header: false, ...options }).rows

test('CRLF and LF both end a record', () => {
  assert.deepEqual(rows('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']])
  assert.deepEqual(rows('a,b\nc,d\n'), [['a', 'b'], ['c', 'd']])
})

test('a quoted field may contain a line ending', () => {
  assert.deepEqual(rows('"x\r\ny",b\n'), [['x\r\ny', 'b']])
})

test('a byte-order mark is not part of the first column name', () => {
  assert.deepEqual(parse('\uFEFF"id",name\n1,a\n').columns, ['id', 'name'])
  assert.deepEqual(parse('\uFEFF"id",name\n1,a\n').rows, [{ id: '1', name: 'a' }])
})
