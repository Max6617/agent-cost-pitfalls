/**
 * The dependency graph.
 *
 * `requires` is a list of ids and a migration may only run once every id in it
 * has run. A release is small enough that everything here is a plain walk over
 * the declared list.
 */
import { byId } from './util/ids.js'

/** `requires` entries that name a migration nobody declared. */
export function missingDependencies(migrations) {
  const declared = byId(migrations)
  const out = []
  for (const migration of migrations) {
    for (const id of migration.requires) {
      if (!declared.has(id)) out.push({ migration: migration.id, missing: id })
    }
  }
  return out
}

/**
 * The migration the walk arrives at twice, or null when the release can be
 * ordered. The walk starts at the first declared migration, which is where the
 * release notes start too, and it only follows a migration once.
 */
export function findCycle(migrations) {
  if (!migrations.length) return null
  const declared = byId(migrations)
  const state = new Map()
  let found = null

  const visit = (migration) => {
    if (found) return
    state.set(migration.id, 'open')
    for (const id of migration.requires) {
      const dependency = declared.get(id)
      if (!dependency) continue
      const seen = state.get(dependency.id)
      if (seen === 'open') { found = [dependency.id]; return }
      if (seen === undefined) visit(dependency)
      if (found) return
    }
    state.set(migration.id, 'closed')
  }

  visit(migrations[0])
  return found
}
