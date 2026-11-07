// Sub-problem 5: money is exact, and rounding happens once, at the end.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, decimal } from '../src/index.js'

const charge = (id, seq, date, value, currency = 'USD') => ({
  id, seq, effectiveDate: date, account: '4100', kind: 'charge', amount: { currency, value },
})

test('addition, subtraction and summation are exact', () => {
  assert.equal(decimal.add('0.1', '0.2'), '0.3')
  assert.equal(decimal.add('1.10', '2.20'), '3.3')
  assert.equal(decimal.add('-0.1', '0.1'), '0')
  assert.equal(decimal.sub('1', '0.9'), '0.1')
  assert.equal(decimal.sub('0.3', '0.3'), '0')
  assert.equal(decimal.sum(['0.01', '0.02', '0.04']), '0.07')
  assert.equal(decimal.sum(['1.005', '2.005', '-3.01']), '0')
  assert.equal(decimal.sum([]), '0')
})

test('multiplication by a rate is exact', () => {
  assert.equal(decimal.mul('0.005', '1.09'), '0.00545')
  assert.equal(decimal.mul('100.00', '1.090000'), '109')
  assert.equal(decimal.mul('-2', '1.5'), '-3')
  assert.equal(decimal.mul('1000', '0.000001'), '0.001')
  assert.equal(decimal.mul('0.1', '0.1'), '0.01')
})

test('rounding is half-up away from zero, at any scale, and never negative zero', () => {
  assert.equal(decimal.round('2.675'), '2.68')
  assert.equal(decimal.round('2.6749999'), '2.67')
  assert.equal(decimal.round('1.005'), '1.01')
  assert.equal(decimal.round('-1.005'), '-1.01')
  assert.equal(decimal.round('109'), '109.00')
  assert.equal(decimal.round('-0.0001'), '0.00')
  assert.equal(decimal.round('2.5', 0), '3')
  assert.equal(decimal.round('-2.5', 0), '-3')
  assert.equal(decimal.round('1.2345', 3), '1.235')
})

test('a balance rounds once, not once per entry, and away from zero when negative', () => {
  const ledger = createLedger({ rates: [{ from: '2024-01-01', currency: 'EUR', rate: '0.500000' }] })
  ledger.postAll([
    charge('rd-1', 1, '2024-01-05', '1.005', 'EUR'),
    charge('rd-2', 2, '2024-01-06', '1.005', 'EUR'),
  ])
  // exact: 0.5025 + 0.5025 = 1.005, which rounds half-up to 1.01
  assert.equal(ledger.balance('4100'), '1.01')

  const single = createLedger()
  single.post(charge('rd-4', 1, '2024-01-05', '2.675'))
  assert.equal(single.balance('4100'), '2.68')
  assert.equal(single.periodTotals('2024-01'), '2.68')

  const overpaid = createLedger()
  overpaid.postAll([
    charge('rd-5', 1, '2024-01-05', '1.00'),
    { id: 'rd-6', seq: 2, effectiveDate: '2024-01-06', account: '4100', kind: 'payment', amount: { currency: 'USD', value: '1.005' } },
  ])
  // exact: -0.005, half-up away from zero
  assert.equal(overpaid.balance('4100'), '-0.01')
  assert.equal(overpaid.periodTotals('2024-01'), '-0.01')
})
