/**
 * The money lines of a quote: the discount, the freight after it, and the
 * surcharges on top. Surcharge amounts are worked out by surcharges.js and
 * passed in, so everything the quote totals lives here.
 */
export const FREE_SHIPPING_THRESHOLD_CENTS = 6000

export function priceLines({ baseCents, discountPct = 0, fragileCents = 0, oversizeCents = 0 }) {
  const subtotalCents = baseCents + fragileCents + oversizeCents
  const discountCents = Math.round((subtotalCents * discountPct) / 100)
  const freightCents = baseCents - discountCents
  return {
    baseCents,
    discountCents,
    freightCents,
    surcharges: { fragileCents, oversizeCents },
  }
}
