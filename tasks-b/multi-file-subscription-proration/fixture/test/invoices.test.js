import test from 'node:test'
import assert from 'node:assert/strict'
import { createBillingService } from '../src/index.js'

const april = { periodStart: '2026-04-01', periodEnd: '2026-04-30' }

test('tax is charged on what remains after the credit is applied', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 1, trial: true, ...april })
  svc.grantCredit('acct-1', 999)
  const result = svc.convertTrial('sub-1', '2026-04-10')
  assert.equal(result.invoice.chargeCents, 2999)
  assert.equal(result.invoice.creditAppliedCents, 999)
  assert.equal(result.invoice.taxCents, 175)
  assert.equal(result.invoice.totalCents, 2175)
})

test('a credit that covers the whole charge leaves nothing due', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'starter', seats: 1, ...april })
  svc.grantCredit('acct-1', 5000)
  const result = svc.changePlan('sub-1', 'growth', '2026-04-16')
  assert.equal(result.invoice.totalCents, 0)
  assert.equal(svc.creditBalance('acct-1'), 4100)
})

test('converting a trial bills the full period and starts a fresh one', () => {
  const svc = createBillingService()
  svc.subscribe({ id: 'sub-1', accountId: 'acct-1', planId: 'growth', seats: 2, trial: true, ...april })
  const result = svc.convertTrial('sub-1', '2026-04-10')
  assert.equal(result.invoice.chargeCents, 5998)
  assert.equal(result.invoice.totalCents, 6523)
  const sub = svc.subscription('sub-1')
  assert.equal(sub.trial, false)
  assert.equal(sub.periodStart, '2026-04-10')
  assert.equal(sub.periodEnd, '2026-05-09')
})
