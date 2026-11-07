import test from 'node:test'
import assert from 'node:assert/strict'
import { toIsbn13, toIsbn10, hyphenateIsbn13, normalizeIsbn } from '../src/index.js'

test('isbn-10 converts to isbn-13 under the 978 prefix', () => {
  assert.equal(toIsbn13('0306406152'), '9780306406157')
})

test('an X-checked isbn-10 converts like any other', () => {
  assert.equal(toIsbn13('0-8044-2957-X'), '9780804429573')
})

test('a 978 isbn-13 converts back to isbn-10', () => {
  assert.equal(toIsbn10('9780306406157'), '0306406152')
})

test('a 979 isbn-13 has no isbn-10 form', () => {
  assert.equal(toIsbn10('9791090632257'), null)
})

test('hyphenation splits prefix, group, registrant, publication and check', () => {
  assert.equal(hyphenateIsbn13('9780306406152'), '978-0-306-40615-2')
})

test('normalize strips documented separators', () => {
  assert.equal(normalizeIsbn('0-306-40615-2'), '0306406152')
})

test('normalize refuses doubled separators', () => {
  assert.equal(normalizeIsbn('03--06406152'), null)
})
