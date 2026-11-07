// Sub-problem 6: partials - indentation, missing names, inclusion depth - and
// the implicit iterator that a list of scalars is read with.
import test from 'node:test'
import assert from 'node:assert/strict'
import { render, renderDetailed } from '../src/index.js'

test('the implicit iterator renders a falsy list element', () => {
  const data = { scores: [0, 1, ''] }
  assert.equal(render('{{#scores}}{{.}},{{/scores}}', data), '0,1,,')
})

test('an indented partial indents every line it produces', () => {
  const partials = { address: '{{city}}\n\n{{zip}}\n' }
  assert.equal(render('  {{>address}}', { city: 'Oslo', zip: '0150' }, { partials }), '  Oslo\n\n  0150\n')
})

test('a missing partial renders nothing and is reported', () => {
  const result = renderDetailed('Hi {{name}}{{>signature}}', { name: 'Ada' }, { partials: {} })
  assert.equal(result.output, 'Hi Ada')
  assert.ok(result.diagnostics.some((d) => d.code === 'missing-partial' && d.name === 'signature'))
})

test('partial recursion stops at the documented depth', () => {
  const partials = { node: '{{name}}{{#children}}({{>node}}){{/children}}' }
  let deep = { name: 'L10' }
  for (let level = 9; level >= 1; level -= 1) deep = { name: 'L' + level, children: [deep] }

  const result = renderDetailed('{{>node}}', deep, { partials })
  const expected = Array.from({ length: 8 }, (_, index) => 'L' + (index + 1) + '(').join('') + ')'.repeat(8)
  assert.equal(result.output, expected)
  assert.ok(result.diagnostics.some((d) => d.code === 'partial-depth'))
})

test('a standalone section line inside an indented partial', () => {
  const partials = { list: 'Items:\n{{#items}}\n- {{name}}\n{{/items}}\n' }
  const data = { items: [{ name: 'a' }, { name: 'b' }] }
  assert.equal(render('  {{>list}}', data, { partials }), '  Items:\n  - a\n  - b\n')
})
