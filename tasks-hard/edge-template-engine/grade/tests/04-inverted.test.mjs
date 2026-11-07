// Sub-problem 4: inverted sections and the truthiness rule they share with
// sections.
import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('an inverted section renders for zero, the empty string and the empty list', () => {
  const data = { count: 0, note: '', items: [] }
  assert.equal(render('{{^count}}c{{/count}}{{^note}}n{{/note}}{{^items}}i{{/items}}', data), 'cni')
})

test('a section and its inverted twin are exact complements', () => {
  const data = { zero: 0, items: [], one: 1, list: [0] }
  assert.equal(render('{{#zero}}A{{/zero}}{{^zero}}B{{/zero}}', data), 'B')
  assert.equal(render('{{#items}}A{{/items}}{{^items}}B{{/items}}', data), 'B')
  assert.equal(render('{{#one}}A{{/one}}{{^one}}B{{/one}}', data), 'A')
  assert.equal(render('{{#list}}A{{/list}}{{^list}}B{{/list}}', data), 'A')
})

test('an inverted section sees a falsy value in an enclosing frame', () => {
  const data = { users: [{ name: 'Ada' }, { name: 'Bob' }], nickname: '', voucher: false }
  assert.equal(render('{{^voucher}}none{{/voucher}}', data), 'none')
  assert.equal(render('{{#users}}[{{^nickname}}?{{/nickname}}]{{/users}}', data), '[?][?]')
})

test('an inverted section inside a list uses the element frame', () => {
  const data = { tasks: [{ id: 'a', done: true }, { id: 'b', done: '' }, { id: 'c' }] }
  assert.equal(render('{{#tasks}}{{^done}}[{{id}}]{{/done}}{{/tasks}}', data), '[b][c]')
})
