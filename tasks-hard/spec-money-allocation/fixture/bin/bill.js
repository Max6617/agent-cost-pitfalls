#!/usr/bin/env node
/**
 * bill - the thin CLI the billing console shells out to.
 *
 *   node bin/bill.js round 2.675 --scale 2 --mode half-up
 *   node bin/bill.js split 0.11 --weights 1,2,3 --scale 2
 *   node bin/bill.js format 1234.5 --currency JPY
 *
 * It is a front end and nothing else: every number it prints comes out of
 * src/index.js, so the console and the service cannot drift apart.
 */
import { roundTo, allocate, formatAmount, convert, createInvoice, defaults } from '../src/index.js'
import { column, moneyColumn } from '../src/util/text.js'

function flag(name, fallback) {
  const index = process.argv.indexOf('--' + name)
  return index === -1 ? fallback : process.argv[index + 1]
}

function usage() {
  console.log('usage: bill <round|split|format|convert|invoice> <amount> [--flags]')
  process.exit(2)
}

const [command, amount] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!command || !amount) usage()

const config = defaults()
const mode = flag('mode', config.defaultRoundingMode)

if (command === 'round') {
  console.log(roundTo(amount, Number(flag('scale', 2)), mode))
} else if (command === 'split') {
  const weights = String(flag('weights', '1')).split(',')
  const scale = Number(flag('scale', 2))
  for (const [index, part] of allocate(amount, weights, { scale, mode }).entries()) {
    console.log(column('share ' + (index + 1), 12) + moneyColumn(part, 12))
  }
} else if (command === 'format') {
  console.log(formatAmount(amount, flag('currency', config.defaultCurrency), { mode }))
} else if (command === 'convert') {
  console.log(convert(amount, flag('rate', '1'), flag('currency', config.defaultCurrency), { mode }))
} else if (command === 'invoice') {
  const currency = flag('currency', config.defaultCurrency)
  const invoice = createInvoice({
    currency,
    lines: [{ description: flag('description', 'Services'), amount }],
  })
  console.log(config.invoicePrefix + ' ' + invoice.total().padStart(12))
} else {
  usage()
}
