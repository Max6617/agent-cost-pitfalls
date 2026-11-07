import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('a list renders its block once per element', () => {
  const data = { items: [{ sku: 'A1' }, { sku: 'B2' }] }
  assert.equal(render('{{#items}}[{{sku}}]{{/items}}', data), '[A1][B2]')
})

test('an object section renders against the object', () => {
  const data = { user: { name: 'Ada', email: 'ada@example.com' } }
  assert.equal(render('{{#user}}{{name}} <{{email}}>{{/user}}', data), 'Ada <ada@example.com>')
})

test('a line item with a quantity of zero still prints', () => {
  const data = { quantities: [0, 1, 2] }
  assert.equal(render('{{#quantities}}{{.}},{{/quantities}}', data), '0,1,2,')
})
