/**
 * Statement assembly.
 *
 * One line per root account, in chart order, with zero lines omitted. Intercompany
 * clearing is excluded unless the caller asks for it: the consolidated statement
 * nets those accounts to nothing anyway and finance does not want them on the
 * management report.
 */
import * as decimal from './decimal.js'
import { accountName, internalBalance, rollup } from './accounts.js'

export function buildStatement({ tree, roots, balances, asOf = null, baseCurrency = 'USD', includeInternal = false, scale = 2 }) {
  const lines = []
  for (const code of roots) {
    const gross = rollup(tree, balances, code)
    const internal = includeInternal ? '0' : internalBalance(tree, balances, code)
    const amount = decimal.round(decimal.sub(gross, internal), scale)
    if (decimal.isZero(amount)) continue
    lines.push({ code, name: accountName(tree, code), amount })
  }

  let total = '0'
  for (const line of lines) total = decimal.add(total, line.amount)

  return {
    asOf,
    currency: baseCurrency,
    internalIncluded: includeInternal,
    lines,
    total: decimal.round(total, scale),
  }
}
