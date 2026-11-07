// Sub-problem 3: reversals negate their target, in the target's period, at the
// target's rate - and they interact with ordering, with idempotency and with FX.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedger } from '../src/index.js'

const rates1090 = [{ from: '2024-01-01', currency: 'EUR', rate: '1.090000' }]

const charge = (id, seq, date, value, currency = 'USD') => ({
  id, seq, effectiveDate: date, account: '4100', kind: 'charge', amount: { currency, value },
})
const reversal = (id, seq, date, reverses, account = '4100') => ({
  id, seq, effectiveDate: date, account, kind: 'reversal', reverses, amount: { currency: 'USD', value: '0' },
})

test('a reversal restates the period of the entry it corrects', () => {
  const ledger = createLedger({ rates: rates1090 })
  ledger.postAll([
    charge('rv-1', 1, '2024-01-15', '100.00', 'EUR'),
    reversal('rv-2', 2, '2024-03-10', 'rv-1', '4200'),
  ])
  assert.equal(ledger.statusOf('rv-2'), 'reversal')
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '0.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-03-31' }), '0.00')
  assert.equal(ledger.periodTotals('2024-01'), '0.00')
  // the account named on the reversal entry is not the account that moves
  assert.equal(ledger.balance('4200'), '0.00')
})

test('a reversal is resolved against its target even when the target is dated later', () => {
  const ledger = createLedger()
  ledger.postAll([
    charge('lt-1', 1, '2024-01-15', '50.00'),
    charge('lt-2', 2, '2024-03-05', '30.00'),
    reversal('lt-3', 3, '2024-02-20', 'lt-2'),
  ])
  assert.equal(ledger.statusOf('lt-3'), 'reversal')
  assert.equal(ledger.balance('4100', { asOf: '2024-01-31' }), '50.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-02-28' }), '50.00')
  assert.equal(ledger.periodTotals('2024-02'), '0.00')
  assert.equal(ledger.balance('4100', { asOf: '2024-03-31' }), '50.00')
})

test('of two reversals of the same entry the canonically first one counts', () => {
  const ledger = createLedger()
  ledger.postAll([
    charge('tw-1', 1, '2024-01-15', '100.00'),
    reversal('tw-2', 2, '2024-03-10', 'tw-1'),
    reversal('tw-3', 3, '2024-03-01', 'tw-1'),
  ])
  assert.equal(ledger.statusOf('tw-3'), 'reversal')
  assert.equal(ledger.statusOf('tw-2'), 'already-reversed')
  assert.equal(ledger.balance('4100'), '0.00')
  assert.equal(ledger.periodTotals('2024-01'), '0.00')
})

test('reversing an entry that was refused for want of a rate changes nothing', () => {
  const ledger = createLedger({ rates: [{ from: '2024-02-01', currency: 'EUR', rate: '1.090000' }] })
  ledger.postAll([
    charge('nr-1', 1, '2024-01-15', '100.00', 'EUR'),
    reversal('nr-2', 2, '2024-02-10', 'nr-1'),
  ])
  assert.equal(ledger.statusOf('nr-1'), 'no-rate')
  assert.equal(ledger.statusOf('nr-2'), 'orphan-reversal')
  assert.equal(ledger.balance('4100'), '0.00')
  assert.equal(ledger.periodTotals('2024-01'), '0.00')
})

test('reversing a reversal restores the charge', () => {
  const ledger = createLedger()
  ledger.postAll([
    charge('rr-1', 1, '2024-01-15', '100.00'),
    reversal('rr-2', 2, '2024-03-01', 'rr-1'),
    reversal('rr-3', 3, '2024-04-01', 'rr-2'),
  ])
  assert.equal(ledger.statusOf('rr-3'), 'reversal')
  assert.equal(ledger.balance('4100'), '100.00')
  // the charge is restored in the period of the reversal that was undone
  assert.equal(ledger.periodTotals('2024-01'), '0.00')
  assert.equal(ledger.periodTotals('2024-03'), '100.00')
})

test('a reversal cancels its target exactly after the rate is republished', () => {
  const ledger = createLedger({
    rates: [
      { from: '2024-01-01', currency: 'EUR', rate: '1.090000' },
      { from: '2024-03-01', currency: 'EUR', rate: '1.200000' },
    ],
  })
  ledger.postAll([
    charge('fx-rv-1', 1, '2024-01-15', '100.00', 'EUR'),
    reversal('fx-rv-2', 2, '2024-03-10', 'fx-rv-1'),
  ])
  assert.equal(ledger.balance('4100', { asOf: '2024-03-31' }), '0.00')
  assert.equal(ledger.periodTotals('2024-01'), '0.00')
})
