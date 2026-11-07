/**
 * Surcharges (docs/pricing.md section 6): fragile handling as a percentage of
 * the base freight, and a flat fee when a parcel is oversize. Both come out in
 * integer cents.
 */
export const OVERSIZE_MAX_SIDE_CM = 100
export const OVERSIZE_FLAT_CENTS = 1500
export const FRAGILE_PCT = 8

/** A parcel is oversize when its longest side exceeds one metre. */
export function isOversize(dimsCm) {
  return Math.max(dimsCm.length, dimsCm.width, dimsCm.height) > OVERSIZE_MAX_SIDE_CM
}

/** Fragile handling: FRAGILE_PCT of the base freight, half-up to the cent. */
export function fragileCents(baseCents) {
  return Math.round((baseCents * FRAGILE_PCT) / 100)
}

export function oversizeCents(dimsCm) {
  return isOversize(dimsCm) ? OVERSIZE_FLAT_CENTS : 0
}
