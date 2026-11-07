#!/usr/bin/env node
/**
 * preview — print what a plan change costs, for support calls.
 * Dates are fixed so the output is reproducible in tickets.
 */
import { createBillingService, formatCents } from '../src/index.js'

const svc = createBillingService()
svc.subscribe({
  id: 'sub-1',
  accountId: 'acct-1',
  planId: 'starter',
  seats: 2,
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
})

const result = svc.changePlan('sub-1', 'growth', '2026-04-16')
if (result.invoice) {
  console.log('charge ', formatCents(result.invoice.chargeCents))
  console.log('credit ', formatCents(result.invoice.creditAppliedCents))
  console.log('tax    ', formatCents(result.invoice.taxCents))
  console.log('total  ', formatCents(result.invoice.totalCents))
} else {
  console.log('no invoice:', result.kind)
}
