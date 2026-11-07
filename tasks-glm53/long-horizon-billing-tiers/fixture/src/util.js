import { CATALOG } from './tables.js'

/**
 * Small helpers shared by the billing job and the quote screen.
 * Pure functions only — nothing here touches the network or the clock.
 */

export function isKnownSku(sku) {
  return Object.prototype.hasOwnProperty.call(CATALOG, sku)
}

export function lineTotal(line) {
  return (Number(line.qty) || 0) * (Number(line.unitPrice ?? CATALOG[line.sku]) || 0)
}

/** Sort lines the way the invoice renderer wants them: catalogue order. */
export function inCatalogueOrder(lines) {
  const order = Object.keys(CATALOG)
  return [...lines].sort((a, b) => order.indexOf(a.sku) - order.indexOf(b.sku))
}

/** Normalise a currency code. */
export function normaliseCurrency(code) {
  return String(code ?? 'USD').trim().toUpperCase()
}
