/**
 * The ledger.
 *
 * The journal is the only state: `post` appends to it and everything else -
 * balances, statuses, period totals - is derived by walking it again in canonical
 * order. That is slower than maintaining running balances and it is the whole
 * point: a derivation that depends on how entries arrived is a derivation that
 * will disagree with itself after a backdated import.
 */
import * as decimal from './decimal.js'
import { buildTree, internalBalance, rollup } from './accounts.js'
import { loadRates, rateAsOf } from './fx.js'
import { createIndex } from './idempotency.js'
import { direction, normalizeEntry } from './journal.js'
import { canonicalOrder } from './order.js'
import { onOrBefore, periodOf } from './periods.js'
import { buildStatement } from './report.js'
import { createStore } from './store.js'

export class Ledger {
  constructor({ baseCurrency = 'USD', accounts = [], rates = [], config = {} } = {}) {
    this.baseCurrency = baseCurrency
    this.accounts = accounts
    this.tree = buildTree(accounts)
    this.rates = loadRates(rates)
    this.config = config
    this.entries = []
    this.store = createStore()
    this.results = new Map()
    this.journalOrder = []
  }

  /** Append one entry. Returns `{ id, status }`. */
  post(raw) {
    return this.postAll([raw])[0]
  }

  /** Append many entries, in the order given. Returns one result per entry. */
  postAll(raws) {
    const list = (raws ?? []).map((raw) => ({ raw, entry: normalizeEntry(raw) }))
    for (const item of list) {
      if (!item.entry.error) this.entries.push(item.entry)
    }
    this.recompute()
    return list.map((item) => item.entry.error
      ? { id: item.entry.id ?? null, status: item.entry.error }
      : { id: item.entry.id, status: this.results.get(item.entry.id) ?? 'unknown' })
  }

  /** Rebuild the derived state for the whole journal. */
  recompute() {
    const view = this.derive(() => true)
    this.journalOrder = view.order
    this.balances = view.balances
    this.statuses = view.status
    this.results = new Map([...view.status].map(([id, status]) => [id, status]))
    return view
  }

  /**
   * One derivation of the journal. `include(date)` decides whether an entry
   * attributed to that date belongs in this view.
   */
  derive(include = () => true) {
    const order = canonicalOrder(this.entries)
    const byId = new Map()
    for (const e of order) if (!byId.has(e.id)) byId.set(e.id, e)

    const index = createIndex()
    const status = new Map()
    const applied = new Map()
    const reversed = new Set()
    const balances = new Map()
    let total = '0'

    const signed = (account, amount) => {
      balances.set(account, decimal.add(balances.get(account) ?? '0', amount))
      total = decimal.add(total, amount)
    }

    for (const e of order) {
      if (status.has(e.id)) continue
      if (e.idempotencyKey && index.has(e.idempotencyKey)) {
        status.set(e.id, 'duplicate')
        continue
      }
      if (e.idempotencyKey) index.add(e.idempotencyKey)

      if (e.kind === 'reversal') {
        const target = byId.get(e.reverses)
        const effect = target ? applied.get(target.id) : null
        if (!effect) {
          status.set(e.id, 'orphan-reversal')
          continue
        }
        if (!include(e.effectiveDate)) continue
        if (reversed.has(target.id)) {
          status.set(e.id, 'already-reversed')
          continue
        }
        signed(effect.account, decimal.negate(effect.amount))
        reversed.add(target.id)
        applied.set(e.id, { account: effect.account, amount: decimal.negate(effect.amount) })
        status.set(e.id, 'reversal')
        continue
      }

      if (!this.tree.has(e.account)) {
        status.set(e.id, 'unknown-account')
        continue
      }
      if (!include(e.effectiveDate)) continue

      const rate = rateAsOf(this.rates, e.amount.currency, e.effectiveDate, this.baseCurrency)
      if (rate === null) {
        status.set(e.id, 'no-rate')
        continue
      }
      const amount = decimal.mul(e.amount.value, rate)
      const effect = direction(e.kind) < 0 ? decimal.negate(amount) : amount
      signed(e.account, effect)
      applied.set(e.id, { account: e.account, amount: effect })
      status.set(e.id, 'applied')
    }

    return { order, byId, balances, status, applied, reversed, total }
  }

  /** The journal, in canonical order. */
  journal() {
    return this.journalOrder.length ? this.journalOrder : canonicalOrder(this.entries)
  }

  statusOf(id) {
    return this.statuses?.get(String(id)) ?? null
  }

  /** An account's balance in the base currency, rounded for reporting. */
  balance(code, { asOf = null } = {}) {
    const view = this.derive((date) => onOrBefore(date, asOf))
    return decimal.round(rollup(this.tree, view.balances, code), 2)
  }

  /** The whole book for one period, rounded for reporting. */
  periodTotals(period) {
    const cached = this.store.get(period)
    if (cached !== null) return cached
    const value = decimal.round(this.derive((date) => periodOf(date) === period).total, 2)
    this.store.set(period, value)
    return value
  }

  /** An account's balance including everything below it, before rounding. */
  rollupOf(code, { asOf = null } = {}) {
    const view = this.derive((date) => onOrBefore(date, asOf))
    return rollup(this.tree, view.balances, code)
  }

  /** The intercompany part of an account's subtree, before rounding. */
  internalOf(code, { asOf = null } = {}) {
    const view = this.derive((date) => onOrBefore(date, asOf))
    return internalBalance(this.tree, view.balances, code)
  }

  statement({ asOf = null, includeInternal = false } = {}) {
    const view = this.derive((date) => onOrBefore(date, asOf))
    return buildStatement({
      tree: this.tree,
      roots: this.accounts.map((a) => a.code),
      balances: view.balances,
      asOf,
      baseCurrency: this.baseCurrency,
      includeInternal,
    })
  }
}
