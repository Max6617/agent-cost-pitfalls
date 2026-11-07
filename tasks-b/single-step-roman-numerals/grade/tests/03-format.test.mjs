// Sub-problem 3: canonical formatting. The hundreds column uses subtractive
// pairs exactly like the tens and ones columns, and out-of-range values throw.
import test from 'node:test'
import assert from 'node:assert/strict'
import { format } from '../src/index.js'

test('the hundreds column uses subtractive pairs like every other column', () => {
  assert.equal(format(400), 'CD')
  assert.equal(format(900), 'CM')
})

test('the largest representable value formats canonically', () => {
  assert.equal(format(3999), 'MMMCMXCIX')
})

test('hundreds pairs combine with tens and ones pairs', () => {
  assert.equal(format(444), 'CDXLIV')
  assert.equal(format(949), 'CMXLIX')
  assert.equal(format(999), 'CMXCIX')
})

test('values without a hundreds pair are unaffected', () => {
  assert.equal(format(2024), 'MMXXIV')
  assert.equal(format(58), 'LVIII')
  assert.equal(format(30), 'XXX')
})

test('format rejects values outside the range', () => {
  assert.throws(() => format(0))
  assert.throws(() => format(4000))
  assert.throws(() => format(-1))
  assert.throws(() => format(2.5))
})
