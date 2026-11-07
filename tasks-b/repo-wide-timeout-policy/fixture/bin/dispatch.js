#!/usr/bin/env node
/**
 * Manual webhook replay for ops: build the app from the shipped config and
 * print the delivery plan for an event given on the command line.
 *
 *   node bin/dispatch.js evt-1042 invoice.paid [timeoutMs]
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createApp } from '../src/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(readFileSync(join(here, '..', 'config', 'dispatch.config.json'), 'utf8'))

const [id, kind, timeout] = process.argv.slice(2)
if (!id || !kind) {
  console.error('usage: node bin/dispatch.js <event-id> <kind> [timeoutMs]')
  process.exit(2)
}

const app = createApp(config)
const plan = app.webhooks.deliver(
  { id, kind },
  timeout === undefined ? {} : { timeout: Number(timeout) },
)
console.log(JSON.stringify(plan, null, 2))
