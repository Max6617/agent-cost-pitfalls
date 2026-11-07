/**
 * FX rates.
 *
 * The rate table is a list of published rates, each stamped with the date it
 * takes effect from. A rate stays in force until a later publication for the
 * same currency replaces it, so the table is really an append-only history.
 */
import * as decimal from './decimal.js'

/** A frozen, ascending-by-publication-date copy of the table. */
export function loadRates(published) {
  return (published ?? [])
    .map((r) => ({ from: String(r.from), currency: String(r.currency), rate: String(r.rate) }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
}

/**
 * The rate to use for an amount in `currency` on `date`, expressed as base
 * currency per unit of `currency`. Null when nothing has been published.
 */
export function rateAsOf(table, currency, date, baseCurrency = 'USD') {
  if (currency === baseCurrency) return '1'
  const forCurrency = (table ?? []).filter((r) => r.currency === currency)
  if (!forCurrency.length) return null
  return forCurrency[forCurrency.length - 1].rate
}

/** base amount for a value in a foreign currency. */
export function convert(value, rate) {
  return decimal.mul(value, rate)
}
