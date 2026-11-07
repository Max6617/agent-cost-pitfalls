#!/usr/bin/env node
// Prints the audit trail for a small demo session, oldest first.
// Usage: node bin/report.js
import { createShop } from '../src/index.js'

const shop = createShop()

shop.accounts.create('demo', { name: 'Demo User', email: 'demo@example.com', role: 'admin', passwordHash: 'hash:demo' })
shop.inventory.register('demo', { sku: 'sku-100', name: 'Widget', onHand: 4, supplier: { name: 'Acme', unitCost: 41 } })
shop.pricing.set('demo', 'sku-100', { amount: 79, currency: 'USD', unitCost: 41 })
const order = shop.orders.create('demo', {
  customer: { name: 'Demo User', email: 'demo@example.com' },
  items: [{ sku: 'sku-100', qty: 1 }],
  payment: { method: 'card', cardToken: 'tok_demo', last4: '4242' },
})
shop.orders.transition('demo', order.id, 'picking')

for (const event of shop.audit.events()) {
  console.log([event.action, event.entity, event.id].join(' '))
}
