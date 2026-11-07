/**
 * The ledger.
 *
 * The journal is the only state: `post` appends to it and everything else -
 * balances, statuses, period totals - is derived by walking it again in canonical
 * order. That is slower than maintaining running balances and it is the whole
 * point: a derivation that depends on how entries arrived is a derivation that
 * will disagree with itself after a backdated import.
 *
 * An entry is not necessarily attributed to its own date. A reversal belongs to
 * the period of the entry it corrects, and its amount is the negation of the
 * effect that entry had - at the rate it had - so that the pair cancels exactly
 * whatever else has happened to the rate table in the meantime.
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
    const seen = new Set(this.entries.map((e) => e.id))
    const list = (raws ?? []).map((raw) => ({ raw, entry: normalizeEntry(raw) }))
    const immediate = new Map()
    for (const item of list) {
      if (item.entry.error) continue
      // The id is assigned by the importer and is stable, so an entry that has
      // already been journalled is the same entry arriving twice.
      if (seen.has(item.entry.id)) { immediate.set(item.entry.id, 'duplicate'); continue }
      seen.add(item.entry.id)
      this.entries.push(item.entry)
    }
    this.recompute()
    return list.map((item) => {
      const entry = item.entry
      if (entry.error) return { id: entry.id ?? null, status: entry.error }
      if (immediate.has(entry.id)) return { id: entry.id, status: immediate.get(entry.id) }
      return { id: entry.id, status: this.results.get(entry.id) ?? 'unknown' }
    })
  }

  /** Rebuild the derived state for the whole journal. */
  recompute() {
    const resolved = this.resolve()
    this.journalOrder = resolved.order
    this.balances = this.derive(() => true).balances
    this.statuses = resolved.status
    this.results = new Map([...resolved.status].map(([id, status]) => [id, status]))
    // A journal that has changed has invalidated every total computed from it.
    this.store.clear()
    return resolved
  }

  /**
   * What every entry did to the book, independent of any reporting date.
   *
   * Three passes, because the three questions have different dependencies: which
   * entries are admitted at all (idempotency keys), what each ordinary entry did,
   * and what each reversal undid. A reversal can be dated before the entry it
   * reverses, so it cannot be resolved while walking the journal forwards in one
   * go; and none of it may depend on the report date, or a period report would
   * disagree with the balance it is made of.
   */
  resolve() {
    const order = canonicalOrder(this.entries)
    const byId = new Map()
    for (const e of order) if (!byId.has(e.id)) byId.set(e.id, e)

    const status = new Map()
    const applied = new Map()
    const reversed = new Set()

    // 1. keys, in canonical order over the whole journal
    const index = createIndex()
    const admitted = []
    for (const e of order) {
      if (e.idempotencyKey && index.has(e.idempotencyKey)) {
        status.set(e.id, 'duplicate')
        continue
      }
      if (e.idempotencyKey) index.add(e.idempotencyKey)
      admitted.push(e)
    }

    // 2. ordinary entries
    for (const e of admitted) {
      if (e.kind === 'reversal') continue
      if (!this.tree.has(e.account)) {
        status.set(e.id, 'unknown-account')
        continue
      }
      const rate = rateAsOf(this.rates, e.amount.currency, e.effectiveDate, this.baseCurrency)
      if (rate === null) {
        status.set(e.id, 'no-rate')
        continue
      }
      const amount = decimal.mul(e.amount.value, rate)
      const effect = direction(e.kind) < 0 ? decimal.negate(amount) : amount
      applied.set(e.id, { account: e.account, amount: effect, attributedDate: e.effectiveDate })
      status.set(e.id, 'applied')
    }

    // 3. reversals, resolved against the effect of their target. Chains (a
    //    reversal of a reversal) are resolved to a fixed point; whatever cannot
    //    be resolved has no target in this journal.
    let pending = admitted.filter((e) => e.kind === 'reversal')
    while (pending.length) {
      const unresolved = []
      let progressed = false
      for (const e of pending) {
        const target = byId.get(e.reverses)
        const effect = target ? applied.get(target.id) : null
        if (!effect) {
          unresolved.push(e)
          continue
        }
        progressed = true
        if (reversed.has(target.id)) {
          status.set(e.id, 'already-reversed')
          continue
        }
        // The reversal belongs to the period of the entry it corrects, and it
        // negates the effect that entry had, at the rate that entry had.
        applied.set(e.id, {
          account: effect.account,
          amount: decimal.negate(effect.amount),
          attributedDate: target.effectiveDate,
        })
        reversed.add(target.id)
        status.set(e.id, 'reversal')
      }
      if (!progressed) {
        for (const e of unresolved) status.set(e.id, 'orphan-reversal')
        break
      }
      pending = unresolved
    }

    return { order, byId, status, applied, reversed }
  }

  /**
   * One derivation of the journal. `include(date)` decides whether an entry
   * attributed to that date belongs in this view.
   */
  derive(include = () => true) {
    const resolved = this.resolve()
    const balances = new Map()
    let total = '0'
    for (const effect of resolved.applied.values()) {
      if (!include(effect.attributedDate)) continue
      balances.set(effect.account, decimal.add(balances.get(effect.account) ?? '0', effect.amount))
      total = decimal.add(total, effect.amount)
    }
    return { ...resolved, balances, total }
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
