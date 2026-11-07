import test from 'node:test'
import assert from 'node:assert/strict'
import { render, escapeHtml } from '../src/index.js'

test('a customer name cannot inject markup into the body', () => {
  assert.equal(render('<p>{{name}}</p>', { name: 'Ann & <b>Bob<b>' }), '<p>Ann &amp; &lt;b&gt;Bob&lt;b&gt;</p>')
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;')
})

test('a value the importer has never heard of renders as nothing', () => {
  assert.equal(render('Hi {{nickname}}!', { name: 'Ada' }), 'Hi !')
})

test('punctuation in a name is escaped too', () => {
  assert.equal(render('{{name}}', { name: "O'Brien / Sons" }), 'O&#39;Brien &#x2F; Sons')
})
