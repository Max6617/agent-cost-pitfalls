// Sub-problem 6: trial conversion bills the full period with no proration,
// and the credit and tax rules apply to it like any charge (docs §9).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBillingService } from '../src/index.js'

const april = { periodStart: '2026-04-01', periodEnd: '2026-04-30' }

test('conversion charges the full period and starts a fresh one on the conversion date', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 2, trial: true, ...april })
  const result = svc.convertTrial('sub-1', '2026-04-10')
  assert.equal(result.kind, 'converted')
  assert.equal(result.invoice.chargeCents, 5998)
  assert.equal(result.invoice.taxCents, 525)
  assert.equal(result.invoice.totalCents, 6523)
  const sub = svc.subscription('sub-1')
  assert.equal(sub.trial, false)
  assert.equal(sub.periodStart, '2026-04-10')
  assert.equal(sub.periodEnd, '2026-05-09')
})

test('conversion spends the credit balance before tax, like any charge', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 3, trial: true, ...april })
  svc.grantCredit('acct-1', 1000)
  const result = svc.convertTrial('sub-1', '2026-04-25')
  // full period 3600 even on the 25th; tax on 2600
  assert.equal(result.invoice.chargeCents, 3600)
  assert.equal(result.invoice.creditAppliedCents, 1000)
  assert.equal(result.invoice.taxCents, 228)
  assert.equal(result.invoice.totalCents, 2828)
})

test('a conversion covered by credit totals zero and keeps the remainder', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 1, trial: true, ...april })
  svc.grantCredit('acct-1', 2000)
  const result = svc.convertTrial('sub-1', '2026-04-10')
  assert.equal(result.invoice.creditAppliedCents, 1200)
  assert.equal(result.invoice.taxCents, 0)
  assert.equal(result.invoice.totalCents, 0)
  assert.equal(svc.creditBalance('acct-1'), 800)
})
