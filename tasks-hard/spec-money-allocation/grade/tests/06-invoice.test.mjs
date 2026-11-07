// Sub-problem 6: what a multi-line invoice reports - docs/billing-rules.md
// section 7. Every amount it prints is written at the invoice currency's minor
// units, and the shares of a shared charge add back up to that charge.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createInvoice, sum } from '../src/index.js'

test('the net is exact and the total is written at the invoice currency\'s minor units', () => {
  const invoice = createInvoice({
    currency: 'USD',
    lines: [
      { description: 'Consulting', amount: '0.1' },
      { description: 'Storage', amount: '0.2' },
    ],
  })
  assert.equal(invoice.net(), '0.3')
  assert.equal(invoice.total(), '0.30')
  assert.equal(invoice.currency, 'USD')
  assert.deepEqual(invoice.lines(), [
    { description: 'Consulting', amount: '0.1' },
    { description: 'Storage', amount: '0.2' },
  ])
  assert.equal(createInvoice({ currency: 'USD', lines: [] }).net(), '0')
  assert.deepEqual(createInvoice({
    currency: 'EUR',
    lines: [{ description: '  Standing charge  ', amount: '10.0' }],
  }).lines(), [{ description: 'Standing charge', amount: '10' }])
  assert.throws(() => createInvoice({ currency: 'XXX', lines: [] }))
  assert.throws(() => createInvoice({ currency: 'USD', lines: [{ description: 'no amount' }] }))
  assert.throws(() => createInvoice({ lines: [] }))
})

test('a discount comes off the net once, not off every line', () => {
  const invoice = createInvoice({
    currency: 'USD',
    lines: [
      { description: 'Line 1', amount: '0.03' },
      { description: 'Line 2', amount: '0.03' },
      { description: 'Line 3', amount: '0.03' },
    ],
  })
  assert.equal(invoice.net(), '0.09')
  assert.equal(invoice.total(), '0.09')
  // 10% of 0.09 is 0.009: one discount of 0.009 rounds to 0.08, while a tenth
  // of a cent off each line rounds to nothing at all.
  assert.equal(invoice.total({ discount: { percent: '10' } }), '0.08')
  assert.equal(invoice.total({ discount: { fixed: '0.005' } }), '0.09')
  assert.equal(invoice.total({ discount: { fixed: '0.005', percent: '10' } }), '0.08')
})

test('a shared charge is split at the invoice currency, and the report foots', () => {
  const yen = createInvoice({
    currency: 'JPY',
    lines: [
      { description: 'Hosting', amount: '1000' },
      { description: 'Support', amount: '1000' },
      { description: 'Backup', amount: '1000' },
    ],
  })
  assert.deepEqual(yen.allocate('100'), ['34', '33', '33'])
  assert.equal(yen.total(), '3000')
  assert.deepEqual(yen.report({ charge: '100' }), {
    currency: 'JPY',
    charge: '100',
    lines: [
      { description: 'Hosting', amount: '1000', share: '34' },
      { description: 'Support', amount: '1000', share: '33' },
      { description: 'Backup', amount: '1000', share: '33' },
    ],
    total: '3000',
  })

  const dinar = createInvoice({
    currency: 'BHD',
    lines: [
      { description: 'Seats', amount: '100.000' },
      { description: 'Credit', amount: '-25.000' },
    ],
  })
  assert.equal(dinar.net(), '75')
  const report = dinar.report({ charge: '0.005', discount: { percent: '10' } })
  assert.equal(report.currency, 'BHD')
  assert.equal(report.charge, '0.005')
  assert.deepEqual(report.lines, [
    { description: 'Seats', amount: '100.000', share: '0.007' },
    { description: 'Credit', amount: '-25.000', share: '-0.002' },
  ])
  assert.equal(report.total, '67.500')
  // the printed shares add back up to the printed charge
  assert.equal(sum(report.lines.map((line) => line.share)), '0.005')
  assert.deepEqual(dinar.allocate('0.005'), ['0.007', '-0.002'])
})
