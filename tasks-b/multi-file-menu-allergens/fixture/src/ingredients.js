/**
 * The ingredient registry.
 *
 * Every ingredient the kitchen buys is registered here with the allergens it
 * inherently carries - its contains set. Anything an ingredient only picks up
 * from shared equipment is not part of this set; that is the equipment
 * matrix's job.
 */
export class IngredientRegistry {
  constructor(list) {
    this.byId = new Map()
    for (const raw of list ?? []) {
      this.byId.set(String(raw.id), {
        id: String(raw.id),
        name: String(raw.name ?? raw.id),
        allergens: [...new Set(raw.allergens ?? [])].sort(),
      })
    }
  }

  has(id) {
    return this.byId.has(String(id))
  }

  get(id) {
    return this.byId.get(String(id)) ?? null
  }

  allergensOf(id) {
    const entry = this.get(id)
    if (!entry) throw new Error(`unknown ingredient: ${id}`)
    return [...entry.allergens]
  }

  ids() {
    return [...this.byId.keys()].sort()
  }
}

export function loadIngredients(list) {
  return new IngredientRegistry(list)
}
