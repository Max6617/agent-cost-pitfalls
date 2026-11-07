// Sub-problem 4: records that are not as wide as the file, and where the reader
// says so.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

function refusal(fn) {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the read to be refused, but it returned a result')
}

test('with no header the first record fixes the width, and clean rows are untouched', () => {
  const { rows } = parse('a,b\nc,d\ne,f\n', { header: false })
  assert.deepEqual(rows, [['a', 'b'], ['c', 'd'], ['e', 'f']])

  const wide = parse('a,b,c\n1,2,3\n', { header: false, ragged: 'pad' })
  assert.deepEqual(wide.rows, [['a', 'b', 'c'], ['1', '2', '3']])
})

test('pad fills a row that is short after a field spanning three lines', () => {
  const text = 'id,note,qty\n1,"a\r\nb\r\nc",2\n2,x\n'
  const { rows } = parse(text, { ragged: 'pad' })
  assert.deepEqual(rows, [
    { id: '1', note: 'a\r\nb\r\nc', qty: '2' },
    { id: '2', note: 'x', qty: null },
  ])

  const error = refusal(() => parse(text))
  assert.equal(error.code, 'ragged-row')
  assert.equal(error.row, 3)
  assert.equal(error.line, 5)
  assert.equal(error.column, 3)
})

test('truncate drops the extra fields of a long row and still refuses a short one', () => {
  const { rows } = parse('id,note\n1,"a\r\nb\r\nc",extra\n', { ragged: 'truncate' })
  assert.deepEqual(rows, [{ id: '1', note: 'a\r\nb\r\nc' }])

  const error = refusal(() => parse('id,qty\n1\n', { ragged: 'truncate' }))
  assert.equal(error.code, 'ragged-row')
  assert.equal(error.column, 2)
})

test('ignore drops every row that does not fit the width, either way', () => {
  const { rows } = parse('id,note\n1,"a\r\nb",2\n3,x\n4\n5,y\n', { ragged: 'ignore' })
  assert.deepEqual(rows, [{ id: '3', note: 'x' }, { id: '5', note: 'y' }])
})

test('a long row after a field spanning three lines reports width+1 and its own line', () => {
  const error = refusal(() => parse('id,note,qty\n1,"a\r\nb\r\nc",2\n2,x,3,4\n'))
  assert.equal(error.code, 'ragged-row')
  assert.equal(error.row, 3)
  assert.equal(error.line, 5)
  assert.equal(error.column, 4)
})
