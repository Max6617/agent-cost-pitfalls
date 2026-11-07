// Sub-problem 3: sections over lists and over objects - how many times the
// block runs and what it can see while it does.
import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('a list renders once per element, in order, against the element', () => {
  const data = { items: [{ sku: 'A1', qty: 2 }, { sku: 'B2', qty: 1 }] }
  assert.equal(render('{{#items}}{{sku}}x{{qty}} {{/items}}', data), 'A1x2 B2x1 ')
})

test('an object section renders once and the enclosing frames stay visible', () => {
  const data = { title: 'Order', order: { id: 7 } }
  assert.equal(render('{{#order}}{{title}} #{{id}}{{/order}}', data), 'Order #7')
})

test('a path inside an object section reaches the enclosing frames', () => {
  const data = { account: { plan: 'pro' }, order: { id: 7 } }
  assert.equal(render('{{#order}}{{id}}/{{account.plan}}{{/order}}', data), '7/pro')
})

test('a truthy scalar renders once against itself, an empty list renders nothing', () => {
  assert.equal(render('{{#label}}[{{.}}]{{/label}}', { label: 'Box' }), '[Box]')
  assert.equal(render('{{#items}}x{{/items}}', { items: [] }), '')
  assert.equal(
    render('{{#rows}}{{#cells}}{{.}},{{/cells}}|{{/rows}}', { rows: [{ cells: ['a', 'b'] }, { cells: ['c'] }] }),
    'a,b,|c,|',
  )
  assert.equal(render('{{#rows}}{{#.}}{{.}}{{/.}}|{{/rows}}', { rows: [['a', 'b'], ['c']] }), 'ab|c|')
})
