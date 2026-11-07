// Sub-problem 6: writing, and getting back what was read.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, write, sniffDialect } from '../src/index.js'

const ESC = '\\'

test('absent and empty are written apart, and quotes appear only where they must', () => {
  assert.equal(write({ columns: ['a', 'b'], rows: [{ a: '1', b: null }] }), 'a,b\r\n1,\r\n')
  assert.equal(write({ columns: ['a', 'b'], rows: [{ a: '1', b: '' }] }), 'a,b\r\n1,""\r\n')
  assert.equal(
    write([['plain', 'a,b', 'say "hi"', '"lead']], { header: false }),
    'plain,"a,b","say ""hi""","""lead"\r\n',
  )
  // a field that is nothing but a quote character
  assert.equal(write([['"']], { header: false }), '""""\r\n')
  // the escape character is only used in front of a quote, and is bare otherwise
  assert.equal(write([['a"b', 'c' + ESC + 'd']], { header: false, escape: ESC }), '"a' + ESC + '"b",c' + ESC + 'd\r\n')
  assert.deepEqual(
    parse(write([['a"b', 'c' + ESC + 'd']], { header: false, escape: ESC }), { header: false, escape: ESC }).rows,
    [['a"b', 'c' + ESC + 'd']],
  )
  // a trimmed read would lose the spaces, so they have to be quoted
  assert.equal(write([[' a ', 'b']], { header: false, trim: true }), '" a ",b\r\n')
  assert.deepEqual(parse('" a ",b\n', { header: false, trim: true }).rows, [[' a ', 'b']])
})

test('the header names set the column order, and the records follow it', () => {
  assert.equal(write([{ a: '1', b: '2' }], { header: ['b', 'a'] }), 'b,a\r\n2,1\r\n')
  assert.equal(write([{ a: '1' }], { header: true }), 'a\r\n1\r\n')
  // no names are known, so there is no header line to write
  assert.equal(write([['1', '2']], { header: true }), '1,2\r\n')
  // a key that is not there is an absent field, not an empty one
  assert.equal(write([{ a: '1' }, { a: '2', b: '' }], { columns: ['a', 'b'] }), 'a,b\r\n1,\r\n2,""\r\n')
})

test('the header line is rendered by the same rules as any other record', () => {
  const text = write({ columns: ['a,b', 'c"d'], rows: [['1', '2']] })
  assert.equal(text, '"a,b","c""d"\r\n1,2\r\n')

  const back = parse(text)
  assert.deepEqual(back.columns, ['a,b', 'c"d'])
  assert.deepEqual(back.rows, [{ 'a,b': '1', 'c"d': '2' }])
})

test('a sniffed file survives parse and write unchanged', () => {
  const text = 'id,note\r\n1,"a,b"\r\n2,"line1\r\nline2"\r\n3,"say ""hi"""\r\n4,\r\n5,""\r\n'
  const dialect = sniffDialect(text)
  assert.equal(dialect.delimiter, ',')
  assert.equal(dialect.eol, '\r\n')

  const result = parse(text, dialect)
  assert.deepEqual(result.rows, [
    { id: '1', note: 'a,b' },
    { id: '2', note: 'line1\r\nline2' },
    { id: '3', note: 'say "hi"' },
    { id: '4', note: null },
    { id: '5', note: '' },
  ])
  assert.equal(write(result, dialect), text)
})
