// Sub-problem 4: tax is charged on the post-credit amount (docs §7), so it is
// zero when credit covers the charge, and full when there is no credit.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBillingService } from '../src/index.js'

const april = { periodStart: '2026-04-01', periodEnd: '2026-04-30' }

test('a partial credit reduces the taxable amount, not just the total', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, trial: true, ...april })
  svc.grantCredit('acct-1', 999)
  const result = svc.convertTrial('sub-1', '2026-04-10')
  // 2999 charge, 999 credit: tax is 8.75% of the remaining 2000, not of 2999
  assert.equal(result.invoice.chargeCents, 2999)
  assert.equal(result.invoice.creditAppliedCents, 999)
  assert.equal(result.invoice.taxCents, 175)
  assert.equal(result.invoice.totalCents, 2175)
})

test('a credit that covers an upgrade leaves nothing to tax', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 1, ...april })
  svc.grantCredit('acct-1', 5000)
  const result = svc.changePlan('sub-1', 'growth', '2026-04-16')
  assert.equal(result.invoice.chargeCents, 900)
  assert.equal(result.invoice.creditAppliedCents, 900)
  assert.equal(result.invoice.taxCents, 0)
  assert.equal(result.invoice.totalCents, 0)
  assert.equal(svc.creditBalance('acct-1'), 4100)
})

test('with no credit balance the tax is on the full charge', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, trial: true, ...april })
  const result = svc.convertTrial('sub-1', '2026-04-10')
  assert.equal(result.invoice.creditAppliedCents, 0)
  assert.equal(result.invoice.taxCents, 262)
  assert.equal(result.invoice.totalCents, 3261)
})
