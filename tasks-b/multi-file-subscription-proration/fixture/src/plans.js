/**
 * The plan catalog. Prices are integer cents per seat per monthly period.
 * The service accepts an override catalog for what-if quotes, but production
 * and the tests both run on this one.
 */
export const defaultCatalog = [
  { id: 'starter', name: 'Starter', seatPriceCents: 1200 },
  { id: 'growth', name: 'Growth', seatPriceCents: 2999 },
  { id: 'scale', name: 'Scale', seatPriceCents: 7999 },
]

export function findPlan(catalog, planId) {
  const plan = catalog.find((p) => p.id === planId)
  if (!plan) throw new Error(`unknown plan: ${planId}`)
  return plan
}
