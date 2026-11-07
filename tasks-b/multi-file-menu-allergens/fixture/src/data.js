/**
 * Loading the checkout's data files.
 *
 * The menu is data-driven: the kitchen edits the JSON, never the code. Reads
 * are relative to this file, so the service works from any working directory.
 */
import { readFileSync } from 'node:fs'

export function readJson(rel) {
  return JSON.parse(readFileSync(new URL('../' + rel, import.meta.url), 'utf8'))
}

export function loadData() {
  return {
    ingredients: readJson('data/ingredients.json'),
    dishes: readJson('data/dishes.json'),
    equipment: readJson('data/equipment.json'),
    substitutions: readJson('data/substitutions.json'),
  }
}
