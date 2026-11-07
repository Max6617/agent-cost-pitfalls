import { zoneForCountry } from './zones.js'
import { CARRIERS } from './data/carriers.js'
import { dimensionalWeightKg } from './dimweight.js'
import { billableWeightKg } from './weight.js'
import { isOversize, fragileCents, oversizeCents } from './surcharges.js'
import { cheapestCarrier } from './carriers.js'
import { priceLines, FREE_SHIPPING_THRESHOLD_CENTS } from './pricing.js'

/**
 * Quote one parcel (see README for the request shape). Returns null when the
 * destination is not served or no carrier can take the parcel.
 */
export function quoteShipment(request) {
  const zone = zoneForCountry(request.country)
  if (zone === null) return null

  const dimWeightKg = dimensionalWeightKg(request.dimsCm)
  const billable = billableWeightKg(request.actualWeightKg, request.dimsCm)
  const oversize = isOversize(request.dimsCm)

  const choice = cheapestCarrier(CARRIERS, { zone, billableWeightKg: billable, oversize })
  if (choice === null) return null

  const base = choice.priceCents
  const lines = priceLines({
    baseCents: base,
    discountPct: request.discountPct ?? 0,
    fragileCents: request.fragile ? fragileCents(base) : 0,
    oversizeCents: oversizeCents(request.dimsCm),
  })

  const freeShipping = lines.baseCents >= FREE_SHIPPING_THRESHOLD_CENTS
  const freightCents = freeShipping ? 0 : lines.freightCents
  const totalCents = freightCents + lines.surcharges.fragileCents + lines.surcharges.oversizeCents

  return {
    country: String(request.country).toUpperCase(),
    zone,
    dimWeightKg,
    billableWeightKg: billable,
    oversize,
    carrier: choice.carrier.code,
    baseCents: lines.baseCents,
    discountCents: lines.discountCents,
    freightCents,
    surcharges: lines.surcharges,
    freeShipping,
    totalCents,
  }
}
