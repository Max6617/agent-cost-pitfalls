// Sub-problem 5: lines a tag owns - what "standalone" means and what it takes
// with it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('a section tag alone on its line takes the line with it', () => {
  const template = 'Names:\n  {{#items}}\n  - {{name}}\n  {{/items}}\nDone\n'
  const data = { items: [{ name: 'a' }, { name: 'b' }] }
  assert.equal(render(template, data), 'Names:\n  - a\n  - b\nDone\n')
})

test('a standalone comment line disappears, and a comment may span lines', () => {
  const template = 'Hi\n{{! one note }}\nthere{{! a\nmulti-line note }}!\n'
  assert.equal(render(template, {}), 'Hi\nthere!\n')
})

test('a partial alone on its line leaves no blank line behind', () => {
  const partials = { note: 'Thanks,\nthe team\n' }
  assert.equal(render('a\n{{>note}}\nb\n', {}, { partials }), 'a\nThanks,\nthe team\nb\n')
})

test('a standalone line goes even with trailing spaces, and a delimiter tag owns its line', () => {
  const template = '  {{#items}}   \n- {{.}}\n  {{/items}}  \n'
  assert.equal(render(template, { items: ['a', 'b'] }), '- a\n- b\n')

  const switched = '{{=<% %>=}}\n<%#items%>\n- <%sku%>\n<%/items%>\n'
  assert.equal(render(switched, { items: [{ sku: 'A1' }] }), '- A1\n')
})
