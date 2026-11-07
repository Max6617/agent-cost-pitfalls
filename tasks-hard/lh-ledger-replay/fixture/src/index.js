/**
 * ledger - public surface.
 *
 * Everything the close job, the importer and the report builders are allowed to
 * import. Modules under src/ that are not re-exported here are internal and may
 * be reorganised freely; the names below may not.
 */
import { loadConfig } from './config.js'
import { Ledger } from './ledger.js'

export { Ledger } from './ledger.js'
export * as decimal from './decimal.js'
export * as fx from './fx.js'
export * as periods from './periods.js'
export { buildTree, rollup, internalBalance, rootCodes, accountName, isInternal } from './accounts.js'
export { normalizeEntry, direction, KINDS } from './journal.js'
export { canonicalOrder, compareEntries } from './order.js'
export { loadConfig, readJson, repoRoot } from './config.js'

/**
 * A ledger wired to this checkout's configuration and data files.
 *
 * `overrides` exists for the close job's what-if runs and for tests: pass
 * `{ rates: [...] }` to work against a hypothetical rate table, or
 * `{ baseCurrency: 'EUR' }` to report in another currency.
 */
export function createLedger(overrides = {}) {
  const config = loadConfig()
  return new Ledger({
    baseCurrency: overrides.baseCurrency ?? config.baseCurrency,
    accounts: overrides.accounts ?? config.accounts.roots,
    rates: overrides.rates ?? config.rateTable.published,
    config,
  })
}
