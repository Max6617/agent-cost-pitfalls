// Sub-problem 3: headers, generated names, repeated names and column mapping.
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

test('a generated name is numbered like any other name, in place', () => {
  const first = parse(',name\r\n1,a\r\n')
  assert.deepEqual(first.columns, ['column_1', 'name'])
  assert.deepEqual(first.rows, [{ column_1: '1', name: 'a' }])

  const quoted = parse('a,"",c\n1,2,3\n')
  assert.deepEqual(quoted.columns, ['a', 'column_2', 'c'])
  assert.deepEqual(quoted.rows, [{ a: '1', column_2: '2', c: '3' }])

  // the generated name is taken by a column the supplier did name, so the count
  // carries on instead of colliding
  const taken = parse(',column_1,name\n1,2,a\n')
  assert.deepEqual(taken.columns, ['column_1', 'column_1_2', 'name'])
  assert.deepEqual(taken.rows, [{ column_1: '1', column_1_2: '2', name: 'a' }])

  assert.deepEqual(parse('a,a,a_2\n1,2,3\n').columns, ['a', 'a_2', 'a_2_2'])
})

test('supplied names are named by the same rules, and set the width', () => {
  const supplied = parse('id,name\n1,a\n', { header: ['x', 'y'] })
  assert.deepEqual(supplied.columns, ['x', 'y'])
  assert.deepEqual(supplied.rows, [{ x: 'id', y: 'name' }, { x: '1', y: 'a' }])

  assert.deepEqual(parse('1,2\n', { header: ['', 'x'] }).columns, ['column_1', 'x'])
  assert.deepEqual(parse('1,2\n', { header: ['x', 'x'] }).columns, ['x', 'x_2'])

  // the width comes from the supplied names, not from the first record
  assert.deepEqual(parse('a,b\n', { header: ['x', 'y'] }).rows, [{ x: 'a', y: 'b' }])
  const error = refusal(() => parse('a,b,c\n', { header: ['x', 'y'] }))
  assert.equal(error.code, 'ragged-row')
  assert.equal(error.row, 1)
  assert.equal(error.column, 3)
})

test('the mapping is applied to the names the header resolved to', () => {
  const mapped = parse('1,2\n', { header: ['ref', 'ref'], rename: { ref_2: 'backup' } })
  assert.deepEqual(mapped.columns, ['ref', 'backup'])
  assert.deepEqual(mapped.rows, [{ ref: '1', backup: '2' }])

  const clash = refusal(() => parse('1,2\n', { header: ['x', 'x'], rename: { x_2: 'x' } }))
  assert.equal(clash.code, 'duplicate-column')
  assert.equal(clash.row, null)
  assert.equal(clash.column, null)
})

test('the mapping reaches a generated name, and a dropped column keeps its place', () => {
  const mapped = parse(',ref,note\n1,2,x\n', { rename: { column_1: 'id', note: null } })
  assert.deepEqual(mapped.columns, ['id', 'ref'])
  assert.deepEqual(mapped.rows, [{ id: '1', ref: '2' }])

  const unknown = refusal(() => parse('a,b\n1,2\n', { rename: { zz: 'x' } }))
  assert.equal(unknown.code, 'unknown-column')
  assert.equal(unknown.row, null)
  assert.equal(unknown.column, null)

  const clash = refusal(() => parse('a,b\n1,2\n', { rename: { b: 'a' } }))
  assert.equal(clash.code, 'duplicate-column')
})
