import test from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../src/index.js'

test('an indented fragment stays indented', () => {
  const partials = { address: '{{city}}\n{{zip}}' }
  assert.equal(render('  {{>address}}', { city: 'Oslo', zip: '0150' }, { partials }), '  Oslo\n  0150')
})

test('a partial renders against the frames of the call site', () => {
  const partials = { signature: '-- {{name}}' }
  const data = { user: { name: 'Ada' } }
  assert.equal(render('{{#user}}{{>signature}}{{/user}}', data, { partials }), '-- Ada')
})
