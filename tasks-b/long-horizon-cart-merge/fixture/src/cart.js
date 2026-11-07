/**
 * A cart and the rules for putting things into it.
 *
 * Two kinds of line share a cart: plain lines, which combine freely, and
 * gift-wrapped parcels, which never do (docs/cart-rules.md pins that). Every
 * line carries the price it was shown at as a snapshot for display; whether
 * that snapshot still means anything is the merge's business, not the cart's.
 */
import { priceFor } from './catalog.js'
import { effectiveCap } from './limits.js'

export function createCart(owner) {
  return { owner, lines: [], couponCode: null }
}

/**
 * Add a line to one cart. Within a single cart the cap in force at that moment
 * tops a plain line up; parcels are outside the cap entirely.
 */
export function addLine(cart, { sku, qty, giftWrap = false, addedAt }, ctx) {
  if (!Number.isInteger(qty) || qty < 1) return { status: 'invalid-quantity' }
  const priceCents = priceFor(ctx.catalog, sku)
  if (priceCents === null) return { status: 'unknown-sku' }

  if (giftWrap) {
    cart.lines.push({ sku, qty, giftWrap: true, addedAt, unitPriceCents: priceCents })
    return { status: 'added' }
  }

  const cap = effectiveCap(sku, ctx)
  const existing = cart.lines.find((l) => l.sku === sku && !l.giftWrap)
  if (!existing && cap === 0) return { status: 'out-of-stock' }
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, cap)
    return { status: 'added' }
  }
  cart.lines.push({ sku, qty: Math.min(qty, cap), giftWrap: false, addedAt, unitPriceCents: priceCents })
  return { status: 'added' }
}

/** A cart as the world sees it: ordered lines, totals, and the discount. */
export function renderView(cart, coupons) {
  const lines = [...cart.lines].sort(compareLines).map((l) => ({
    ...l,
    lineTotalCents: l.qty * l.unitPriceCents,
  }))
  const subtotalCents = lines.reduce((n, l) => n + l.lineTotalCents, 0)
  const coupon = (coupons ?? []).find((c) => c.code === cart.couponCode) ?? null
  const discountCents = coupon ? Math.floor((subtotalCents * coupon.percentOff + 50) / 100) : 0
  return {
    lines,
    couponCode: cart.couponCode,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
  }
}

function compareLines(a, b) {
  if (a.addedAt !== b.addedAt) return a.addedAt < b.addedAt ? -1 : 1
  return a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0
}
