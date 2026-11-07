/**
 * Dimensional (volumetric) weight.
 *
 * Carriers charge for the space a parcel takes, not only its mass: the volume
 * is converted to kilograms at the divisor pinned in docs/pricing.md
 * (5000 cm3 per kilogram).
 */
export const DIM_DIVISOR_CM3_PER_KG = 5000

export function volumeCm3(dimsCm) {
  return dimsCm.length * dimsCm.width * dimsCm.height
}

export function dimensionalWeightKg(dimsCm) {
  return volumeCm3(dimsCm) / DIM_DIVISOR_CM3_PER_KG
}
