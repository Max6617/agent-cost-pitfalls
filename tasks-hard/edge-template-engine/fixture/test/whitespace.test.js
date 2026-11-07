import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('a tag on a line of its own leaves no blank line behind', () => {
  const template = 'Receipt\n{{#items}}\n- {{sku}}\n{{/items}}\nThanks\n'
  const data = { items: [{ sku: 'A1' }, { sku: 'B2' }] }
  assert.equal(render(template, data), 'Receipt\n- A1\n- B2\nThanks\n')
})

test('a tag with text around it keeps the text where it was written', () => {
  assert.equal(render('Hi {{name}}!\n', { name: 'Ada' }), 'Hi Ada!\n')
})
