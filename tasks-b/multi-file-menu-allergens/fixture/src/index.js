/**
 * menu - public surface.
 *
 * Everything the letter job, the floor tablets and the board generator are
 * allowed to import. Modules under src/ that are not re-exported here are
 * internal and may be reorganised freely; the names below may not.
 */
export { Menu, createMenu } from './menu.js'
export { IngredientRegistry, loadIngredients } from './ingredients.js'
export { substituteEntries, indexDishes } from './dishes.js'
export { containsOf } from './allergens.js'
export { tracesFor } from './equipment.js'
export * as sets from './sets.js'
export { loadData, readJson } from './data.js'
