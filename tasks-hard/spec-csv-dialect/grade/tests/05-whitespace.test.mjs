// Sub-problem 5: absent, empty and whitespace.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

const rows = (text, options = {}) => parse(text, { header: false, ...options }).rows

function refusal(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the read to be refused, but it returned a result')
}

test('an unquoted empty field is absent, and a quoted empty field is empty', () => {
  assert.deepEqual(rows('a,,b\n'), [['a', null, 'b']])
  assert.deepEqual(rows('a,"",b\n'), [['a', '', 'b']])
  assert.deepEqual(parse('id,note\n1,\n2,""\n').rows, [
    { id: '1', note: null },
    { id: '2', note: '' },
  ])
  // a row the policy lengthened is absent where it was filled in, and only there
  assert.deepEqual(parse('id,note\n1,""\n2\n', { ragged: 'pad' }).rows, [
    { id: '1', note: '' },
    { id: '2', note: null },
  ])
})

test('trim reaches the edges of unquoted fields, and only spaces and tabs', () => {
  assert.deepEqual(rows('\ta\t,\t"b"\t\n', { trim: true }), [['a', '"b"']])
  assert.deepEqual(rows(' a ," b "\n', { trim: true }), [['a', ' b ']])
  assert.deepEqual(rows(' a ," b "\n'), [[' a ', ' b ']])
  assert.deepEqual(rows('  \n', { trim: true }), [[null]])
  // a no-break space is neither a space nor a tab, so it is part of the value
  assert.deepEqual(rows('\u00A0a\u00A0\n', { trim: true }), [['\u00A0a\u00A0']])
})

test('a line of spaces is a record, and a short one is padded with absent fields', () => {
  const { rows: padded } = parse('id,qty\n   \n1,2\n', { trim: true, ragged: 'pad' })
  assert.deepEqual(padded, [{ id: null, qty: null }, { id: '1', qty: '2' }])

  const error = refusal(() => parse('id,qty\n   \n1,2\n', { trim: true }))
  assert.equal(error.code, 'ragged-row')
})
