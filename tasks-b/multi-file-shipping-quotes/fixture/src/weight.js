import { dimensionalWeightKg } from './dimweight.js'

export const BILLING_STEP_KG = 0.5
export const MIN_BILLABLE_KG = 0.5

/**
 * Billable weight: the greater of actual and dimensional weight, taken to the
 * billing step (docs/pricing.md section 3). Nothing bills below half a kilo.
 */
export function billableWeightKg(actualKg, dimsCm) {
  const chargeable = Math.max(actualKg, dimensionalWeightKg(dimsCm))
  return Math.max(MIN_BILLABLE_KG, roundToStep(chargeable))
}

function roundToStep(kg) {
  return Math.round(kg / BILLING_STEP_KG) * BILLING_STEP_KG
}
