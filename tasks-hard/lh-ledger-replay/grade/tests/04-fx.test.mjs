// Sub-problem 4: which published rate an entry gets, and when.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, fx } from '../src/index.js'

const charge = (id, seq, date, value, currency = 'USD', account = '4100') => ({
  id, seq, effectiveDate: date, account, kind: 'charge', amount: { currency, value },
})

test('a rate published on the entry date is in force on that date', () => {
  const table = [
    { from: '2024-01-15', currency: 'EUR', rate: '1.090000' },
    { from: '2024-03-01', currency: 'EUR', rate: '1.200000' },
  ]
  assert.equal(fx.rateAsOf(table, 'EUR', '2024-01-15'), '1.090000')
  assert.equal(fx.rateAsOf(table, 'EUR', '2024-02-29'), '1.090000')
  assert.equal(fx.rateAsOf(table, 'EUR', '2024-03-01'), '1.200000')

  const ledger = createLedger({ rates: table })
  assert.equal(ledger.post(charge('bd-1', 1, '2024-01-15', '100.00', 'EUR')).status, 'applied')
  assert.equal(ledger.balance('4100'), '109.00')
})

test('an entry before the first publication for its currency is refused', () => {
  const ledger = createLedger({ rates: [{ from: '2024-01-15', currency: 'EUR', rate: '1.090000' }] })
  assert.equal(ledger.post(charge('np-1', 1, '2024-01-14', '100.00', 'EUR')).status, 'no-rate')
  assert.equal(ledger.balance('4100'), '0.00')

  assert.equal(ledger.post(charge('np-2', 2, '2024-01-15', '100.00', 'EUR')).status, 'applied')
  assert.equal(ledger.periodTotals('2024-01'), '109.00')
})

test('republishing a rate does not restate an earlier period', () => {
  const ledger = createLedger({
    rates: [
      { from: '2024-01-01', currency: 'EUR', rate: '1.090000' },
      { from: '2024-03-01', currency: 'EUR', rate: '1.200000' },
    ],
  })
  ledger.postAll([
    charge('rp-1', 1, '2024-01-15', '100.00', 'EUR'),
    charge('rp-2', 2, '2024-03-15', '100.00', 'EUR'),
  ])
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '109.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-02-29' }), '109.00')
  assert.equal(ledger.periodTotals('2024-01'), '109.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-03-31' }), '229.00')
})

test('a payment in a foreign currency converts at its own date rate', () => {
  const ledger = createLedger({
    rates: [
      { from: '2024-01-01', currency: 'EUR', rate: '1.090000' },
      { from: '2024-03-01', currency: 'EUR', rate: '1.200000' },
    ],
  })
  ledger.postAll([
    charge('py-1', 1, '2024-01-15', '100.00', 'EUR'),
    { id: 'py-2', seq: 2, effectiveDate: '2024-03-15', account: '4100', kind: 'payment', amount: { currency: 'EUR', value: '50.00' } },
  ])
  assert.equal(ledger.balance('4100', { asOf: '2024-03-31' }), '49.00')
  assert.equal(ledger.periodTotals('2024-03'), '-60.00')
})
