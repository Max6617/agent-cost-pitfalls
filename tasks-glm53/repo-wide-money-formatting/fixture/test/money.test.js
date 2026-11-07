import test from 'node:test'
import assert from 'node:assert/strict'
import * as cents from '../src/cents.js'
import * as money from '../src/money.js'
import { renderSummary, describe } from '../src/modules/invoices.js'
import { renderConfirmation } from '../src/modules/emails.js'
import { exportCsv, exportFooter } from '../src/modules/csv.js'
import { paidCard, refundsCard, netCard, outstandingRows } from '../src/modules/dashboard.js'

const order = {
  reference: 'A-1001',
  lines: [
    { sku: 'TEA-01', qty: 2, unitPrice: 8.25 },
    { sku: 'MUG-04', qty: 1, unitPrice: 14 },
  ],
}

test('rounds half away from zero on the cases floating point gets wrong', () => {
  assert.equal(cents.round(1.005), 1.01)
  assert.equal(cents.round(2.675), 2.68)
  assert.equal(cents.round(1.0049), 1)
  assert.equal(cents.round(0.125), 0.13)
})

test('renders a plain amount', () => {
  assert.equal(cents.format(8.25), '$8.25')
  assert.equal(cents.format(0), '$0.00')
  assert.equal(cents.format(1234.5), '$1,234.50')
})

test('renders a negative amount with the sign outside the symbol', () => {
  assert.equal(cents.format(-4), '-$4.00')
  assert.equal(cents.format(-0.005), '-$0.01')
  assert.equal(cents.format(-0), '$0.00')
})

test('rounds on the way out, not before', () => {
  assert.equal(cents.format(2.675), '$2.68')
  assert.equal(cents.format(2.674), '$2.67')
})

test('honours a symbol and a precision', () => {
  assert.equal(cents.format(4, { symbol: 'EUR ' }), 'EUR 4.00')
  assert.equal(cents.format(4.567, { dp: 1 }), '$4.6')
})

test('sums exactly and rounds once', () => {
  assert.equal(cents.sum([0.1, 0.2]), 0.3)
  assert.equal(cents.format(cents.sum(Array.from({ length: 30 }, () => 0.105))), '$3.15')
})

test('splits an amount into shares that add back up', () => {
  const shares = cents.split(10, 3)
  assert.deepEqual(shares, [3.34, 3.33, 3.33])
  assert.equal(cents.sum(shares), 10)
  assert.equal(cents.format(cents.sum(cents.split(0.05, 3))), '$0.05')
})

test('refuses a nonsense number of parts', () => {
  assert.throws(() => cents.split(10, 0), /parts must be a positive integer/)
})

test('the invoice summary renders totals and credits', () => {
  const summary = renderSummary({ ...order, credit: 10.5 })
  assert.equal(summary.total, '$20.00')
  assert.deepEqual(summary.lines.map((l) => l.amount), ['$16.50', '$14.00'])
  assert.equal(describe(order), 'A-1001  $30.50')
})

test('the confirmation email renders a refund as a negative amount', () => {
  const mail = renderConfirmation({ ...order, refunded: 12.5 })
  assert.match(mail.body, /Total charged: \$30\.50/)
  assert.match(mail.body, /Refunded: -\$12\.50/)
})

test('the confirmation email rounds the charged total once', () => {
  const mail = renderConfirmation({ ...order, discount: 0.005 })
  assert.match(mail.body, /Total charged: \$30\.50/)
})

test('the finance export renders every cell through the shared routine', () => {
  const csv = exportCsv([
    { reference: 'A-1001', total: 30.5 },
    { reference: 'A,1002', total: -12.5 },
  ])
  assert.equal(csv, 'reference,total\nA-1001,$30.50\n"A,1002",-$12.50\n')
})

test('the export footer rounds the grand total once', () => {
  const rows = Array.from({ length: 30 }, () => ({ reference: 'A', total: 0.105 }))
  assert.equal(exportFooter(rows), 'TOTAL,$3.15')
})

test('the dashboard cards render deltas against the money rules', () => {
  const record = { paid: 100, previousPaid: 120, refunded: 5, previousRefunded: 2 }
  assert.deepEqual(paidCard(record), { title: 'Paid', value: '$100.00', delta: '-$20.00' })
  assert.equal(refundsCard(record).value, '-$5.00')
  assert.equal(refundsCard(record).delta, '-$3.00')
  assert.equal(netCard(record).value, '$95.00')
})

test('the outstanding table renders negatives correctly', () => {
  assert.deepEqual(outstandingRows([{ name: 'Ada', balance: -0.5 }]), [{ name: 'Ada', balance: '-$0.50' }])
})

test('every rendering module goes through the money facade', () => {
  const calls = []
  money.setRenderer({
    format: (amount, options) => {
      calls.push(amount)
      return 'STUB'
    },
    sum: () => 0,
    split: () => [],
    round: (v) => v,
  })
  try {
    renderSummary(order)
    renderConfirmation(order)
    exportCsv([{ reference: 'A-1001', total: 1 }])
    paidCard({ paid: 1, previousPaid: 0 })
    refundsCard({ refunded: 1, previousRefunded: 0 })
    netCard({ paid: 1, refunded: 0, previousPaid: 0, previousRefunded: 0 })
    outstandingRows([{ name: 'Ada', balance: 1 }])
  } finally {
    money.setRenderer(null)
  }

  assert.ok(calls.length >= 8, 'expected the stub to be called by every module, got ' + calls.length)
})
