/**
 * The menu service.
 *
 * One place that knows how a dish's contains set, its equipment traces and a
 * guest's allergy set come together into a severity. The ladder itself -
 * contains refuses, traces warn - is spelled out in docs/allergen-rules.md.
 */
import { containsOf } from './allergens.js'
import { loadData } from './data.js'
import { indexDishes, substituteEntries } from './dishes.js'
import { tracesFor } from './equipment.js'
import { IngredientRegistry } from './ingredients.js'
import { difference, intersect } from './sets.js'

export class Menu {
  constructor({ ingredients, dishes, equipment, substitutions } = {}) {
    this.registry = new IngredientRegistry(ingredients)
    this.dishesById = indexDishes(dishes, this.registry)
    this.matrix = equipment ?? {}
    this.substitutions = substitutions ?? []
    for (const swap of this.substitutions) {
      for (const ref of [swap.replace, swap.with]) {
        if (!this.registry.has(ref)) throw new Error(`unknown ingredient: ${ref}`)
      }
    }
  }

  /** Every dish id on the menu, alphabetical. */
  list() {
    return [...this.dishesById.keys()].sort()
  }

  /** The severity report for one dish and one guest's allergy set. */
  assess(dishId, allergies = [], opts = {}) {
    const dish = this.dishesById.get(String(dishId))
    if (!dish) throw new Error(`unknown dish: ${dishId}`)
    const entries = substituteEntries(dish, this.substitutions)
    const contains = containsOf(entries, this.registry, opts)
    const traces = difference(tracesFor(this.matrix, dish.equipment), contains)
    const matched = intersect(contains, allergies)
    const warnings = intersect(traces, allergies)
    const status = matched.length > 0 ? 'unsafe' : warnings.length > 0 ? 'warning' : 'safe'
    return { dish: dish.id, status, contains, traces, matched, warnings }
  }

  /** The board for one guest: every dish in exactly one list. */
  safeMenu(allergies = [], opts = {}) {
    const board = { safe: [], warning: [], excluded: [] }
    for (const id of this.list()) {
      const result = this.assess(id, allergies, opts)
      if (result.status === 'unsafe') board.excluded.push(id)
      else if (result.status === 'warning') board.warning.push(id)
      else board.safe.push(id)
    }
    return board
  }
}

/**
 * A menu wired to this checkout's data files.
 *
 * `overrides` exists for what-if runs and for tests: pass
 * `{ substitutions: [] }` to work a day with no swaps in force, or
 * `{ dishes: [...] }` to try a new menu against the same kitchen.
 */
export function createMenu(overrides = {}) {
  const data = loadData()
  return new Menu({
    ingredients: overrides.ingredients ?? data.ingredients,
    dishes: overrides.dishes ?? data.dishes,
    equipment: overrides.equipment ?? data.equipment,
    substitutions: overrides.substitutions ?? data.substitutions,
  })
}
