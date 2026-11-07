import test from 'node:test'
import assert from 'node:assert/strict'
import { pickTier, rateForQty, tierLabel } from '../src/tiers.js'
import { resolveCode, isPercentCode } from '../src/codes.js'
import { roundMoney, sameMoney } from '../src/money.js'
import { convert } from '../src/currency.js'
import { priceLine, invoice } from '../src/pricing.js'
import { Ledger } from '../src/ledger.js'
import { TIERS } from '../src/tables.js'

test('a quantity just below a threshold keeps the lower tier', () => {
  assert.equal(rateForQty(9), 0.05)
  assert.equal(rateForQty(4), 0)
})

test('a quantity exactly at a threshold takes that tier', () => {
  assert.equal(rateForQty(5), 0.05)
  assert.equal(rateForQty(10), 0.12)
  assert.equal(rateForQty(25), 0.2)
})

test('the highest applicable threshold wins, not the first in the table', () => {
  assert.equal(pickTier(30).threshold, 25)
  assert.equal(pickTier(24).threshold, 10)
  assert.equal(pickTier(100).rate, 0.2)
})

test('a tier table in a different order gives the same answer', () => {
  const shuffled = [...TIERS].reverse()
  assert.equal(pickTier(30, shuffled).threshold, 25)
  assert.equal(pickTier(7, shuffled).threshold, 5)
})

test('the tier label is what the quote screen shows', () => {
  assert.equal(tierLabel({ threshold: 10, rate: 0.12 }), '10+ (12%)')
})

test('a percentage code takes a share of the taxable amount', () => {
  assert.equal(resolveCode('OFF10', 100).discount, 10)
  assert.equal(resolveCode('OFF25', 84).discount, 21)
})

test('a fixed code takes a flat amount off', () => {
  assert.equal(resolveCode('SHIP5', 84).discount, 5)
  assert.equal(resolveCode('LOYAL7', 84).discount, 7.5)
})

test('an unknown code discounts nothing and says why', () => {
  const r = resolveCode('NOPE', 84)
  assert.equal(r.discount, 0)
  assert.equal(r.reason, 'unknown-code')
})

test('no code at all is not an error', () => {
  const r = resolveCode(undefined, 84)
  assert.equal(r.code, null)
  assert.equal(r.discount, 0)
  assert.equal(r.reason, undefined)
})

test('a percentage code is recognised as one', () => {
  assert.equal(isPercentCode('off10'), true)
  assert.equal(isPercentCode('SHIP5'), false)
})

test('rounding is half-up on the cases floating point gets wrong', () => {
  assert.equal(roundMoney(1.005), 1.01)
  assert.equal(roundMoney(2.675), 2.68)
  assert.equal(roundMoney(1.0049), 1)
  assert.equal(roundMoney(0.125), 0.13)
})

test('rates are quoted per one USD and applied by multiplying', () => {
  assert.equal(convert(100, 'USD', 'EUR'), 92)
  assert.equal(convert(100, 'USD', 'GBP'), 79)
  assert.equal(convert(50, 'USD', 'EUR'), 46)
})

test('converting to the same currency changes nothing', () => {
  assert.equal(convert(12.345, 'USD', 'USD'), 12.345)
})

test('an unpublished rate is an error, not a silent pass-through', () => {
  assert.throws(() => convert(10, 'USD', 'XYZ'), /no published rate for XYZ/)
})

test('a line is charged with its tier discount applied', () => {
  const line = priceLine({ sku: 'MUG-04', qty: 6 })
  assert.equal(line.extended, 84)
  assert.equal(line.tierRate, 0.05)
  assert.equal(line.tierOff, 4.2)
  assert.equal(line.taxable, 79.8)
})

test('a line below the minimum charge is floored before the tier discount', () => {
  const line = priceLine({ sku: 'TEA-01', qty: 4 })
  assert.equal(line.extended, 33)
  assert.equal(line.floored, 33)
  assert.equal(line.taxable, 33)

  const small = priceLine({ sku: 'GIFT-BOX', qty: 2 })
  assert.equal(small.extended, 4.8)
  assert.equal(small.floored, 25)
  assert.equal(small.taxable, 25)
})

test('a discount may take an invoice below the minimum charge', () => {
  const line = priceLine({ sku: 'GIFT-BOX', qty: 25, code: 'OFF25' })
  assert.equal(line.floored, 60)
  assert.equal(line.tierRate, 0.2)
  assert.equal(line.tierOff, 12)
  assert.equal(line.codeOff, 12)
  assert.equal(line.taxable, 36)
})

test('a code applies after the tier discount, not to the extended amount', () => {
  const line = priceLine({ sku: 'MUG-04', qty: 6, code: 'OFF10' })
  assert.equal(line.codeOff, 7.98)
  assert.equal(line.taxable, 71.82)
})

test('an unknown code leaves the line alone and is recorded', () => {
  const line = priceLine({ sku: 'MUG-04', qty: 6, code: 'NOPE' })
  assert.equal(line.codeOff, 0)
  assert.equal(line.reason, 'unknown-code')
  assert.equal(line.taxable, 79.8)
})

test('an invoice totals the exact line amounts and rounds once', () => {
  const lines = Array.from({ length: 6 }, () => ({ sku: 'GIFT-BOX', qty: 1 }))
  const result = invoice(lines)
  assert.equal(result.taxable, 150)
  assert.equal(result.lines[0].taxable, 25)
})

test('the invoice figure is not the sum of separately rounded lines', () => {
  const result = invoice([
    { sku: 'GIFT-BOX', qty: 3, code: 'OFF10' },
    { sku: 'GIFT-BOX', qty: 3, code: 'OFF10' },
    { sku: 'GIFT-BOX', qty: 3, code: 'OFF10' },
  ])
  assert.equal(result.lines[0].taxable, 22.5)
  assert.equal(result.taxable, 67.5)
})

test('a ledger accumulates exactly and rounds once', () => {
  const ledger = new Ledger()
  ledger.charge(0.1, 'a').charge(0.2, 'b')
  assert.ok(sameMoney(ledger.balance(roundMoney), 0.3))
  assert.equal(ledger.balance(roundMoney), 0.3)
})

test('many small entries do not drift the statement balance', () => {
  const ledger = new Ledger()
  for (let i = 0; i < 30; i++) ledger.charge(0.105, 'line-' + i)
  assert.equal(ledger.balance(roundMoney), 3.15)
})

test('a credit reduces the balance', () => {
  const ledger = new Ledger(10)
  ledger.charge(5, 'a').credit(2.5, 'b')
  assert.equal(ledger.balance(roundMoney), 12.5)
  assert.equal(ledger.statement().length, 2)
})
