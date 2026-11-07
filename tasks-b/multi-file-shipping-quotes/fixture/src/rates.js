/**
 * Freight for one carrier on one zone at a billable weight, in integer cents:
 * the base fee plus the per-kilogram rate (docs/pricing.md section 4).
 * Returns null when the carrier has no rate for the zone.
 */
export function freightCents(carrier, zone, billableKg) {
  const rate = carrier.rates[String(zone)]
  if (!rate) return null
  return rate.base + Math.round(rate.perKg * billableKg)
}
