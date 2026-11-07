/**
 * Dishes and the day's substitutions.
 *
 * A dish is a list of ingredient entries - `{ ref, optional? }` - plus the
 * equipment stations it is prepared on. The substitution list rewrites
 * entries before any allergen set is computed: a swap is the kitchen's
 * promise that the replaced ingredient does not go into the dish at all.
 */

/** The dish's entries with the in-force substitutions applied. */
export function substituteEntries(dish, substitutions) {
  const entries = (dish.ingredients ?? []).map((e) => ({
    ref: String(e.ref),
    optional: e.optional === true,
  }))
  for (const swap of substitutions ?? []) {
    if (swap.dish !== dish.id) continue
    const index = entries.findIndex((e) => e.ref === swap.replace)
    if (index === -1) continue
    entries[index] = { ...entries[index], ref: String(swap.with) }
  }
  return entries
}

/** The dish records, normalised, indexed by id and checked against the registry. */
export function indexDishes(dishes, registry) {
  const byId = new Map()
  for (const raw of dishes ?? []) {
    const dish = {
      id: String(raw.id),
      name: String(raw.name ?? raw.id),
      ingredients: (raw.ingredients ?? []).map((e) => ({
        ref: String(e.ref),
        optional: e.optional === true,
      })),
      equipment: (raw.equipment ?? []).map(String),
    }
    for (const entry of dish.ingredients) {
      if (!registry.has(entry.ref)) throw new Error(`unknown ingredient: ${entry.ref}`)
    }
    byId.set(dish.id, dish)
  }
  return byId
}
