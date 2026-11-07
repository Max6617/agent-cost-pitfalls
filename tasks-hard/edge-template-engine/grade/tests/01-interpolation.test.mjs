// Sub-problem 1: interpolation - the escape table, the two verbatim spellings,
// and what a value with no string form contributes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { render, escapeHtml } from '../src/index.js'

test('an escaped tag replaces exactly the seven documented characters', () => {
  const note = '& < > " \' ` / = +'
  assert.equal(render('{{note}}', { note }), '&amp; &lt; &gt; &quot; &#39; &#96; &#x2F; = +')
  assert.equal(escapeHtml('5 / 7 `x`'), '5 &#x2F; 7 &#96;x&#96;')
})

test('both verbatim spellings render the value unchanged', () => {
  const data = { html: "<b>Ada's</b>" }
  assert.equal(render('{{{html}}}', data), "<b>Ada's</b>")
  assert.equal(render('{{&html}}', data), "<b>Ada's</b>")
  assert.equal(render('[{{html}}]', data), '[&lt;b&gt;Ada&#39;s&lt;&#x2F;b&gt;]')
})

test('a missing name, null and undefined all render as nothing', () => {
  assert.equal(render('[{{missing}}][{{nothing}}]', { nothing: null }), '[][]')
  assert.equal(render('[{{name}}]', { name: undefined }), '[]')
  assert.equal(render('[{{{missing}}}]', {}), '[]')
})

test('characters outside the escape table pass through untouched', () => {
  assert.equal(render('{{query}}', { query: 'a=1+2 50% ünïcode' }), 'a=1+2 50% ünïcode')
  assert.equal(escapeHtml(0), '0')
  assert.equal(escapeHtml(false), 'false')
})
