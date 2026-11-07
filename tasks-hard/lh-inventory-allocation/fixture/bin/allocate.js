#!/usr/bin/env node
/**
 * allocate — run one picking pass over a morning's orders.
 *
 *   node bin/allocate.js 2024-05-01T06:00:00.000Z
 *
 * The site's settings come from config/warehouse.config.json and the orders
 * from the file named on the command line, if there is one. The engine itself
 * is never told what time it is by the clock: the instant is this argument.
 */
import { readJson, repoRoot } from '../src/config.js'
import { backorderReport, createAllocator, loadConfig, stockReport } from '../src/index.js'

const at = process.argv[2]
if (!at) {
  console.error('usage: node bin/allocate.js <instant> [orders.json]')
  process.exit(2)
}

const config = loadConfig()
const allocator = createAllocator({
  packSize: config.packSize,
  defaultTtlMs: config.defaultTtlMs,
  channels: config.channels,
})

const ordersPath = process.argv[3] ?? repoRoot() + '/data/orders.json'
let orders = []
try {
  orders = readJson(ordersPath).orders
} catch {
  console.error('no order file at ' + ordersPath + '; running against the empty queue')
}

for (const order of orders) allocator.receive({ ...order.receipt, at })
for (const order of orders) {
  allocator.addDemand({ ...order, placedAt: order.placedAt ?? at })
  for (const [channel, qty] of Object.entries(order.buffer ?? {})) {
    allocator.setBuffer({ channel, sku: order.sku, warehouse: order.warehouse, qty })
  }
}

const run = allocator.allocate({ at })
for (const line of run.lines) {
  console.log([
    line.status.padEnd(9),
    line.warehouse + '/' + line.sku,
    'order ' + line.orderId,
    'filled ' + line.filled + '/' + line.requested,
    line.outstanding ? 'backordered ' + line.outstanding : '',
  ].join('  '))
}

console.log('')
console.log('filled ' + run.filled + ' units, backordered ' + run.backordered)
for (const row of stockReport(allocator, { at })) {
  console.log('  ' + row.warehouse + '/' + row.sku + '  on hand ' + row.onHand + '  held ' + row.held + '  free ' + row.free)
}
const backorders = backorderReport(allocator)
console.log('backorder queue: ' + backorders.count + ' line(s), ' + backorders.units + ' unit(s)')
