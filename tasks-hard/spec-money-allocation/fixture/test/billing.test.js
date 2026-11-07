import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAmount, applyDiscount, createInvoice } from '../src/index.js'

test('an amount is written at its own currency\'s minor units', () => {
  assert.equal(formatAmount('1234.5', 'JPY'), '1235')
  assert.equal(formatAmount('3000', 'JPY'), '3000')
  assert.equal(formatAmount('1.0005', 'BHD'), '1.001')
  assert.equal(formatAmount('100', 'BHD'), '100.000')
})

test('the voucher comes off before the percentage is taken', () => {
  assert.equal(applyDiscount('100.00', { fixed: '10', percent: '20' }), '72.00')
  assert.equal(applyDiscount('10.00', {}), '10.00')
})

test('a percentage is taken off the invoice once, not off every line', () => {
  const invoice = createInvoice({
    currency: 'USD',
    lines: [
      { description: 'Line 1', amount: '0.03' },
      { description: 'Line 2', amount: '0.03' },
      { description: 'Line 3', amount: '0.03' },
    ],
  })
  assert.equal(invoice.total(), '0.09')
  assert.equal(invoice.total({ discount: { percent: '10' } }), '0.08')
})

test('an invoice reports at its own currency', () => {
  const invoice = createInvoice({
    currency: 'JPY',
    lines: [
      { description: 'Hosting', amount: '1000' },
      { description: 'Support', amount: '2000' },
    ],
  })
  assert.deepEqual(invoice.allocate('300'), ['100', '200'])
  assert.equal(invoice.total(), '3000')
})
