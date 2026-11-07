import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAmount, formatMoney } from '../src/money.js'

test('reads a plain dollar amount', () => {
  assert.equal(parseAmount('$12.50'), 12.5)
})

test('reads a padded amount with a trailing currency code', () => {
  assert.equal(parseAmount(' 12.50 USD'), 12.5)
})

test('reads an amount with a thousands separator', () => {
  assert.equal(parseAmount('1,234.56'), 1234.56)
})

test('reads an accounting negative', () => {
  assert.equal(parseAmount('(12.50)'), -12.5)
})

test('renders a negative amount with the sign outside the symbol', () => {
  assert.equal(formatMoney(-4), '-$4.00')
})

test('renders a positive amount', () => {
  assert.equal(formatMoney(1234.5), '$1234.50')
})
