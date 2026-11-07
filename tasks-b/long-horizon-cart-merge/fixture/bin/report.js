/**
 * bin/report.js - print an account cart the way the weekly ops snapshot does.
 *
 *   node bin/report.js
 *
 * A fixed demo cart; the real job feeds it from the session store.
 */
import { createCartService, formatCents } from '../src/index.js'

const service = createCartService({
  catalog: [
    { sku: 'MUG', title: 'Enamel mug', priceCents: 1200 },
    { sku: 'TEA', title: 'Green tea', priceCents: 800 },
  ],
  stock: { MUG: 20, TEA: 20 },
  maxPerCustomer: 6,
  coupons: [{ code: 'SPRING', percentOff: 10, minSubtotalCents: 1000, validUntil: '2026-12-31' }],
})

service.guestAdd('demo-session', { sku: 'MUG', qty: 2, addedAt: '2026-01-10' })
service.guestCoupon('demo-session', 'SPRING', '2026-01-10')
service.login('demo-customer', 'demo-session', '2026-01-15')

const view = service.view('demo-customer')
for (const line of view.lines) {
  console.log(`${line.qty} x ${line.sku}${line.giftWrap ? ' (gift)' : ''}  ${formatCents(line.lineTotalCents)}`)
}
console.log(`subtotal  ${formatCents(view.subtotalCents)}`)
console.log(`discount  ${formatCents(view.discountCents)}`)
console.log(`total     ${formatCents(view.totalCents)}`)
