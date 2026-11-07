/**
 * Static reference data for billing.
 *
 * These tables are copied from the wholesale price list and the treasury rate
 * export. Nothing here is computed — it is all transcription, and it changes on
 * finance's schedule, not ours.
 */

/** Catalogue prices, in USD, per unit. */
export const CATALOG = {
  'TEA-01': 8.25,
  'MUG-04': 14,
  'KETTLE-9': 39.99,
  'GIFT-BOX': 2.4,
}

/**
 * Quantity discount tiers, ascending by threshold.
 *
 * A tier applies at or above its threshold; the highest applicable threshold
 * wins.
 */
export const TIERS = [
  { threshold: 1, rate: 0 },
  { threshold: 5, rate: 0.05 },
  { threshold: 10, rate: 0.12 },
  { threshold: 25, rate: 0.2 },
]

/** Promotional codes. */
export const CODES = {
  OFF10: { kind: 'percent', value: 0.1 },
  OFF25: { kind: 'percent', value: 0.25 },
  SHIP5: { kind: 'fixed', value: 5 },
  LOYAL7: { kind: 'fixed', value: 7.5 },
}

/**
 * Treasury rates: units of the target currency per one USD.
 *
 * 0.92 EUR per USD, so 100 USD is 92 EUR.
 */
export const RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
}

/** Settings the billing job runs with. */
export const SETTINGS = {
  roundingDp: 2,
  minCharge: 25,
  defaultCurrency: 'USD',
}
