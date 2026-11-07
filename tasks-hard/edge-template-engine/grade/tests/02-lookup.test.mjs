// Sub-problem 2: names, dotted paths and the frames a name is resolved against.
import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('a key that literally contains a dot beats the path reading', () => {
  const data = { 'user.name': 'literal', user: { name: 'nested' } }
  assert.equal(render('{{user.name}}', data), 'literal')
  assert.equal(render('{{#user}}{{name}}{{/user}}', data), 'nested')
})

test('a numeric segment indexes into a list', () => {
  const data = { items: [{ name: 'first' }, { name: 'second' }], grid: [[1, 2], [3, 4]] }
  assert.equal(render('{{items.1.name}}', data), 'second')
  assert.equal(render('{{grid.1.0}}', data), '3')
})

test('a path that ends on a falsy value still resolves', () => {
  const data = { stats: { count: 0, note: '', flag: false } }
  assert.equal(render('{{stats.count}}|{{stats.note}}|{{stats.flag}}', data), '0||false')
})

test('a path resolves through the frames a list section pushed', () => {
  const data = { users: [{ name: 'Ada' }, { name: 'Bob' }], org: { city: 'Oslo' } }
  assert.equal(render('{{#users}}{{name}}@{{org.city}} {{/users}}', data), 'Ada@Oslo Bob@Oslo ')
})
