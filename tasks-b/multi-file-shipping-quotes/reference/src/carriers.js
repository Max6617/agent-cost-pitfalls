import { freightCents } from './rates.js'

/**
 * Carriers that can take the parcel: they serve the zone, they take the weight
 * (up to and including their maximum), and they accept oversize parcels when
 * the parcel is oversize (docs/pricing.md section 5).
 */
export function eligibleCarriers(carriers, { zone, billableWeightKg, oversize }) {
  return carriers.filter((carrier) =>
    carrier.zones.includes(zone) &&
    billableWeightKg <= carrier.maxKg &&
    (oversize ? carrier.oversize : true) &&
    freightCents(carrier, zone, billableWeightKg) !== null)
}

/**
 * The cheapest eligible carrier, as { carrier, priceCents }, or null when
 * nobody can take the parcel. A price tie goes to the lowest carrier code.
 */
export function cheapestCarrier(carriers, ctx) {
  let best = null
  for (const carrier of eligibleCarriers(carriers, ctx)) {
    const priceCents = freightCents(carrier, ctx.zone, ctx.billableWeightKg)
    if (best === null || priceCents < best.priceCents ||
        (priceCents === best.priceCents && carrier.code < best.carrier.code)) {
      best = { carrier, priceCents }
    }
  }
  return best
}
