#!/usr/bin/env node
/**
 * desk - the standup demo driver. Walks one record across two boards and
 * prints the rollup. Not part of the library surface; src/index.js is.
 */
import { createOrders, createTickets, summarise } from '../src/index.js'

const orders = createOrders()
orders.add({ id: 'o-1', status: 'new' })
orders.transition('o-1', 'triaged')

const tickets = createTickets()
tickets.add({ id: 't-1' })

for (const [board, records] of Object.entries({ orders: orders.all(), tickets: tickets.all() })) {
  const { counts, active, total } = summarise(records.map((r) => r.status))
  console.log(`${board}: ${total} record(s), ${active} active`, counts)
}
