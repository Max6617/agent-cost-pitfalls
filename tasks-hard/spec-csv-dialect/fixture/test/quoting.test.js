// The quoting examples from docs/dialect-spec.md, §10.1.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, ParseError } from '../src/index.js'

const rows = (text, options = {}) => parse(text, { header: false, ...options }).rows

test('the delimiter separates fields and the quotes come off', () => {
  assert.deepEqual(rows('a,b,c\n'), [['a', 'b', 'c']])
  assert.deepEqual(rows('"a,b",c\n'), [['a,b', 'c']])
  assert.deepEqual(rows('"a""b",c\n'), [['a"b', 'c']])
})

test('a quote character is data unless it opens the field', () => {
  assert.deepEqual(rows('a"b,c\n'), [['a"b', 'c']])
  assert.deepEqual(rows('ab",c\n'), [['ab"', 'c']])
})

test('an escape character other than the quote escapes a quote inside a field', () => {
  assert.deepEqual(rows('"a\\"b",c\n', { escape: '\\' }), [['a"b', 'c']])
})

test('data after a closing quote is refused', () => {
  assert.throws(() => rows('"a"x,b\n'), (error) => {
    assert.ok(error instanceof ParseError)
    assert.equal(error.code, 'text-after-quote')
    assert.equal(error.row, 1)
    assert.equal(error.column, 1)
    return true
  })
})
