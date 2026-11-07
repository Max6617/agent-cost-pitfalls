#!/usr/bin/env node
/**
 * close — run the month-end close for one period.
 *
 *   node bin/close.js 2024-01 [--all] [--internal] [--json]
 *
 * The importer writes journal entries to a file the close job reads; in this
 * checkout the file is data/close-<period>.json when it exists, so the job can
 * be exercised without the importer.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createLedger, repoRoot } from '../src/index.js'
import { periodEnd } from '../src/periods.js'
import { createLogger } from '../src/util/log.js'

const args = process.argv.slice(2)
const period = args.find((a) => /^\d{4}-\d{2}$/.test(a))
const flags = new Set(args.filter((a) => a.startsWith('--')))
const log = createLogger({ level: flags.has('--quiet') ? 'warn' : 'info' })

if (!period) {
  console.error('usage: node bin/close.js <YYYY-MM> [--internal] [--json]')
  process.exit(2)
}

const ledger = createLedger()
const source = join(repoRoot, 'data', 'close-' + period + '.json')
if (existsSync(source)) {
  const entries = JSON.parse(readFileSync(source, 'utf8'))
  const results = ledger.postAll(entries)
  const refused = results.filter((r) => r.status !== 'applied' && r.status !== 'reversal')
  log.info('imported entries', { total: entries.length, refused: refused.length })
  for (const r of refused) log.warn('entry refused', { id: r.id, status: r.status })
} else {
  log.warn('no import file for this period', { period, looked: source })
}

const asOf = periodEnd(period)
const statement = ledger.statement({ asOf, includeInternal: flags.has('--internal') })

if (flags.has('--json')) {
  console.log(JSON.stringify({ period, asOf, ...statement }, null, 2))
} else {
  log.info('statement', { period, asOf, currency: statement.currency })
  for (const line of statement.lines) console.log('  ' + line.code + '  ' + line.name.padEnd(24) + line.amount.padStart(14))
  console.log('  ' + ''.padEnd(28) + statement.total.padStart(14))
}
