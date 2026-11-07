// Sub-problem 2: lines and the ends of files - LF, CRLF, embedded newlines, a
// missing final terminator and the byte-order mark.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

const rows = (text, options = {}) => parse(text, { header: false, ...options }).rows

test('a blank line is not a row and does not use up a row number', () => {
  assert.deepEqual(rows('a,b\n\n\nc,d\n'), [['a', 'b'], ['c', 'd']])
  assert.deepEqual(rows('x\n""\n'), [['x'], ['']])
})

test('a quoted field keeps every line ending inside it, next to a quote included', () => {
  // three lines in one quoted field, with the two kinds of ending mixed
  assert.deepEqual(rows('"a\r\nb\nc",d\n'), [['a\r\nb\nc', 'd']])
  // the CRLF inside the quotes is content; the CRLF after `b` ends the record
  assert.deepEqual(rows('"x\r\n",b\r\n'), [['x\r\n', 'b']])
  assert.deepEqual(rows('"x\ny",b\n'), [['x\ny', 'b']])
})

test('the record after the last terminator is read too, wherever it starts', () => {
  assert.deepEqual(parse('id,note\n1,"a\r\nb"').rows, [{ id: '1', note: 'a\r\nb' }])
  assert.deepEqual(rows('a,b\nc,d'), [['a', 'b'], ['c', 'd']])
  // a terminator with nothing after it adds no row
  assert.deepEqual(rows('a,b\n\n'), [['a', 'b']])
  assert.deepEqual(rows('a,b\nc,d'), rows('a,b\nc,d\n'))
  assert.deepEqual(rows(''), [])
})

test('a byte-order mark is dropped at the very start of the file and nowhere else', () => {
  assert.deepEqual(parse('\uFEFF"a",b\n1,2\n').columns, ['a', 'b'])
  assert.deepEqual(parse('\uFEFF"a",b\n1,2\n').rows, [{ a: '1', b: '2' }])
  // a mark that is not the first character of the text is data, quoted or not
  assert.deepEqual(rows('"\uFEFFa",b\n'), [['\uFEFFa', 'b']])
  assert.deepEqual(parse('id,\uFEFFnote\n1,a\n').columns, ['id', '\uFEFFnote'])
  assert.deepEqual(rows('a\n\uFEFFb\n'), [['a'], ['\uFEFFb']])
})
