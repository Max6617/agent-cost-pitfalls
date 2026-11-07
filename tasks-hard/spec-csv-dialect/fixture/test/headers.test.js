// Headers and column names - docs/dialect-spec.md, §5 and §10.3.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/index.js'

test('the first record names the columns, unless the caller says otherwise', () => {
  const named = parse('id,name\n1,a\n')
  assert.deepEqual(named.columns, ['id', 'name'])
  assert.deepEqual(named.rows, [{ id: '1', name: 'a' }])

  const plain = parse('id,name\n1,a\n', { header: false })
  assert.equal(plain.columns, null)
  assert.deepEqual(plain.rows, [['id', 'name'], ['1', 'a']])
})

test('a column the supplier did not name is named by its position', () => {
  const { columns, rows } = parse(',name\n1,a\n')
  assert.deepEqual(columns, ['column_1', 'name'])
  assert.deepEqual(rows, [{ column_1: '1', name: 'a' }])
})

test('two columns with the same name are kept apart', () => {
  const { columns, rows } = parse('id,id\n1,2\n')
  assert.deepEqual(columns, ['id', 'id_2'])
  assert.deepEqual(rows, [{ id: '1', id_2: '2' }])
})
