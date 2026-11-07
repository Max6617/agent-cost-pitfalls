#!/usr/bin/env node
/**
 * Quote one parcel from the command line:
 *
 *   node bin/quote.js DE 4 40x30x20 --fragile --discount 10
 */
import { quoteShipment, formatCents } from '../src/index.js'

const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const positional = args.filter((a) => !a.startsWith('--'))

if (positional.length !== 3 || !/^\d+x\d+x\d+$/.test(positional[2])) {
  console.error('usage: node bin/quote.js <country> <kg> <LxWxH> [--fragile] [--discount pct]')
  process.exit(2)
}

const [length, width, height] = positional[2].split('x').map(Number)
const discountFlag = flags.find((f) => f.startsWith('--discount'))
const discountPct = discountFlag ? Number(discountFlag.split('=')[1] ?? args[args.indexOf('--discount') + 1]) : 0

const quote = quoteShipment({
  country: positional[0],
  actualWeightKg: Number(positional[1]),
  dimsCm: { length, width, height },
  fragile: flags.includes('--fragile'),
  discountPct,
})

if (quote === null) {
  console.log('not servable')
} else {
  console.log(`carrier   ${quote.carrier} (zone ${quote.zone})`)
  console.log(`billable  ${quote.billableWeightKg} kg`)
  console.log(`freight   ${formatCents(quote.freightCents)}`)
  console.log(`surcharge ${formatCents(quote.surcharges.fragileCents + quote.surcharges.oversizeCents)}`)
  console.log(`total     ${formatCents(quote.totalCents)}`)
}
