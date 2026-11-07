/**
 * Merging a guest cart into an account cart at login.
 *
 * The fold walks the guest cart and works each line into the account cart:
 * parcels cross over as they are, plain lines join their SKU's line. Then the
 * whole merged cart is brought back inside the rules: every line is re-resolved
 * against the catalog, every plain line is re-capped against the cap in force
 * at merge time, and anything the catalog has stopped carrying is reported as
 * dropped, guest lines first, then account lines.
 */
import { findSku, isAvailable, priceFor } from './catalog.js'
import { combineQuantities, effectiveCap } from './limits.js'

export function mergeCarts(accountCart, guestCart, ctx) {
  const droppedSkus = []

  for (const line of guestCart.lines) {
    if (!isAvailable(findSku(ctx.catalog, line.sku), ctx.now)) {
      droppedSkus.push(line.sku)
      continue
    }
    if (line.giftWrap) {
      accountCart.lines.push({ ...line })
      continue
    }
    const existing = accountCart.lines.find((l) => l.sku === line.sku && !l.giftWrap)
    if (existing) {
      existing.qty = combineQuantities(existing.qty, line.qty, effectiveCap(line.sku, ctx))
      if (line.addedAt < existing.addedAt) existing.addedAt = line.addedAt
    } else {
      accountCart.lines.push({ ...line })
    }
  }

  const kept = []
  for (const line of accountCart.lines) {
    if (!isAvailable(findSku(ctx.catalog, line.sku), ctx.now)) {
      droppedSkus.push(line.sku)
      continue
    }
    line.unitPriceCents = priceFor(ctx.catalog, line.sku)
    if (!line.giftWrap) line.qty = Math.min(line.qty, effectiveCap(line.sku, ctx))
    if (line.qty > 0) kept.push(line)
  }
  accountCart.lines = kept

  return { droppedSkus }
}
