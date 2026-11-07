// Sub-problem 6: hyphenation against the simplified registrant table.
import test from 'node:test'
import assert from 'node:assert/strict'
import { hyphenateIsbn13 } from '../src/index.js'

test('the registrant element length follows the range table', () => {
  assert.equal(hyphenateIsbn13('9780306406152'), '978-0-306-40615-2')
  assert.equal(hyphenateIsbn13('9781402890345'), '978-1-402-89034-5')
})

test('a two-digit registrant hyphenates after two digits', () => {
  assert.equal(hyphenateIsbn13('9780197029213'), '978-0-19-702921-3')
  assert.equal(hyphenateIsbn13('978-0-19-702921-3'), '978-0-19-702921-3')
})

test('longer registrants come from the later bands', () => {
  assert.equal(hyphenateIsbn13('9780702992124'), '978-0-7029-9212-4')
  assert.equal(hyphenateIsbn13('9780950000015'), '978-0-9500000-1-5')
})

test('hyphenation is positional and keeps a wrong check digit untouched', () => {
  assert.equal(hyphenateIsbn13('9780306406159'), '978-0-306-40615-9')
  assert.equal(hyphenateIsbn13('978-0-306-40615-2'), '978-0-306-40615-2')
  assert.equal(hyphenateIsbn13('9791090632257'), null)
  assert.equal(hyphenateIsbn13('9782070542451'), null)
})
