import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger, fx } from '../src/index.js'

const charges = (ledger) => [
  { id: 'fx-1', seq: 1, effectiveDate: '2024-01-15', account: '4100', kind: 'charge', amount: { currency: 'EUR', value: '100.00' } },
  { id: 'fx-2', seq: 2, effectiveDate: '2024-03-15', account: '4100', kind: 'charge', amount: { currency: 'EUR', value: '100.00' } },
]

test('an entry converts at the rate published for its own date', () => {
  const table = [
    { from: '2024-01-01', currency: 'EUR', rate: '1.090000' },
    { from: '2024-03-01', currency: 'EUR', rate: '1.200000' },
  ]
  assert.equal(fx.rateAsOf(table, 'EUR', '2024-01-15'), '1.090000')
  assert.equal(fx.rateAsOf(table, 'EUR', '2024-03-15'), '1.200000')

  const ledger = createLedger({ rates: table })
  ledger.postAll(charges(ledger))
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '109.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-03-31' }), '229.00')
})

test('the base currency is not looked up in the rate table', () => {
  const ledger = createLedger({ rates: [] })
  ledger.post({ id: 'usd-1', seq: 1, effectiveDate: '2024-01-15', account: '4100', kind: 'charge', amount: { currency: 'USD', value: '50.00' } })
  assert.equal(ledger.balance('4100'), '50.00')
})

test('an entry in a currency with no published rate is refused', () => {
  const ledger = createLedger()
  const result = ledger.post({ id: 'xts-1', seq: 1, effectiveDate: '2024-01-15', account: '4100', kind: 'charge', amount: { currency: 'XTS', value: '50.00' } })
  assert.equal(result.status, 'no-rate')
  assert.equal(ledger.balance('4100'), '0.00')
})
