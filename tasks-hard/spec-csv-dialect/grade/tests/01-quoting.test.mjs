// Sub-problem 1: quoting - where the quote character is special, how a quote is
// escaped, and what happens when a quoted field is malformed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, resolveDialect, DEFAULT_DIALECT, ParseError } from '../src/index.js'

const ESC = '\\'
const rows = (text, options = {}) => parse(text, { header: false, ...options }).rows

function refusal(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the read to be refused, but it returned a result')
}

test('resolveDialect fills in the documented defaults', () => {
  assert.deepEqual(resolveDialect(), DEFAULT_DIALECT)
  assert.equal(DEFAULT_DIALECT.delimiter, ',')
  assert.equal(DEFAULT_DIALECT.quote, '"')
  assert.equal(DEFAULT_DIALECT.escape, '"')
  assert.equal(DEFAULT_DIALECT.eol, '\r\n')
  assert.equal(DEFAULT_DIALECT.header, true)
  assert.equal(DEFAULT_DIALECT.trim, false)
  assert.equal(DEFAULT_DIALECT.ragged, 'error')
  const { dialect } = parse('a\n')
  assert.equal(dialect.delimiter, ',')
  assert.equal(dialect.quote, '"')
  assert.equal(dialect.escape, '"')
  assert.equal(dialect.eol, '\r\n')
  assert.equal(dialect.header, true)
  assert.equal(dialect.trim, false)
  assert.equal(dialect.ragged, 'error')
})

test('a doubled quote is content, and the field ends at the quote left over', () => {
  assert.deepEqual(rows('"a""b",c\n'), [['a"b', 'c']])
  // "a""" is a field whose content ends with a doubled quote: the pair is one
  // character of content and the quote after it closes the field
  assert.deepEqual(rows('"a""",b\n'), [['a"', 'b']])
  assert.deepEqual(rows('"""",b\n'), [['"', 'b']])

  const error = refusal(() => rows('"a""\n'))
  assert.equal(error.code, 'unterminated-quote')
  assert.equal(error.row, 1)
  assert.equal(error.column, 1)
  assert.equal(error.line, 1)
})

test('escape is special only immediately in front of the quote', () => {
  // "a\"",b - the escape takes the quote, and the next quote closes the field
  assert.deepEqual(rows('"a' + ESC + '"",b\n', { escape: ESC }), [['a"', 'b']])
  assert.deepEqual(rows('"a' + ESC + '"b",c\n', { escape: ESC }), [['a"b', 'c']])

  // "a\\",b - the second backslash escapes the closing quote, so the record runs
  // on and never closes
  const error = refusal(() => rows('"a' + ESC + ESC + '",b\n', { escape: ESC }))
  assert.equal(error.code, 'unterminated-quote')
  assert.equal(error.row, 1)
  assert.equal(error.column, 1)
  assert.equal(error.line, 1)
})

test('data after a closing quote is refused where that record begins', () => {
  const error = refusal(() => rows('a,b\n"x\r\ny"z,2\n'))
  assert.ok(error instanceof ParseError)
  assert.equal(error.name, 'ParseError')
  assert.equal(error.code, 'text-after-quote')
  assert.equal(error.row, 2)
  assert.equal(error.column, 1)
  assert.equal(error.line, 2)
})

test('a quoted field that never closes is refused at the line it opened on', () => {
  // record 1 is one line and record 2 spans two, so the record whose quote opens
  // in row 3 starts on physical line 4
  const error = refusal(() => rows('a,b\n"x\r\ny",2\n3,"four\n'))
  assert.equal(error.code, 'unterminated-quote')
  assert.equal(error.row, 3)
  assert.equal(error.column, 2)
  assert.equal(error.line, 4)
})
