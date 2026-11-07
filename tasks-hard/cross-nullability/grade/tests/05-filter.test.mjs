// Sub-problem 5: the search filter. A condition about a field is answered by
// the state of that field, so a row whose field was never filled in and a row
// whose field was cleared do not give the same answer.
import {
  test,
} from 'node:test'
import {
  default as strict,
} from 'node:assert/strict'
import { compileFilter, makeCondition, parseFilter, search } from '../src/index.js'

const assert = strict

const rows = [
  { id: 'cleared', phone: null },
  { id: 'asked', phone: '+49 30 1234' },
  { id: 'never', company: 'Analytical Engines' },
  { id: 'blank', phone: '' },
]

const ids = (list) => list.map((row) => row.id)
const answers = (condition, row) => compileFilter([condition])(row)

test('a search for a value finds only the rows that hold it', () => {
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: '=', value: '+49 30 1234' }])), ['asked'])
  assert.deepEqual(ids(search(rows, [{ field: 'company', op: 'is present' }])), ['never'])
  assert.deepEqual(ids(search(rows, [{ field: 'creditLimit', op: '>=', value: 0 }])), [])
  assert.deepEqual(ids(search([{ id: 'x', creditLimit: 0 }], [{ field: 'creditLimit', op: '>=', value: 0 }])), ['x'])
})

test('= null finds the rows that were cleared and not the rows that never had the field', () => {
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: '=', value: null }])), ['cleared'])
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: 'is missing' }])), ['never'])
})

test('!= null finds every row that holds a value, empty ones included', () => {
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: '!=', value: null }])), ['asked', 'never', 'blank'])
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: '=', value: null }])), ['cleared'])
})

test('an empty value is a value: it is not a row with no phone number', () => {
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: '=', value: '' }])), ['blank'])
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: 'no value' }])), ['cleared', 'never'])
  assert.deepEqual(ids(search(rows, [{ field: 'phone', op: 'is present' }])), ['cleared', 'asked', 'blank'])
  const isNull = makeCondition('phone', '=', null)
  const isBlank = makeCondition('phone', '=', '')
  const isGone = makeCondition('phone', 'is missing')
  const row = (phone) => (phone === undefined ? { id: 'x' } : { id: 'x', phone })
  assert.deepEqual([isNull, isBlank, isGone].map((c) => answers(c, row(null))), [true, false, false])
  assert.deepEqual([isNull, isBlank, isGone].map((c) => answers(c, row(''))), [false, true, false])
  assert.deepEqual([isNull, isBlank, isGone].map((c) => answers(c, row(undefined))), [false, false, true])
})

test('the filter syntax the search box sends compiles to the same conditions', () => {
  const conditions = parseFilter('phone = null and notes has no value')
  assert.equal(conditions.length, 2)
  const predicate = compileFilter(conditions)
  const matched = search(
    [
      { id: 'a', phone: null, notes: null },
      { id: 'b', phone: null, notes: '' },
      { id: 'c', phone: '+49 30 1234' },
    ],
    conditions,
  )
  assert.deepEqual(ids(matched), ['a'])
  assert.equal(predicate({ id: 'd', phone: null, notes: '' }), false)
  assert.equal(predicate({ id: 'e', phone: '+49 30', notes: null }), false)
  assert.equal(conditions[0].field, 'phone')
  assert.equal(conditions[1].op, 'no value')
})
