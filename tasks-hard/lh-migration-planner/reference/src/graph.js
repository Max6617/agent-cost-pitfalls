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
 * The migrations of one cycle in dependency order, or null when the release can
 * be ordered.
 *
 * Every migration is walked, not just the first one: a loop behind the first
 * ticket is as fatal as one in front of it. A cycle is recorded as the open path
 * from the migration the walk came back to, so it names the members of the loop
 * and nothing that merely leads into it.
 *
 * When a release holds more than one cycle, the one whose earliest-declared
 * member was declared first is the one reported, and the list starts at that
 * member so the report is stable.
 */
export function findCycle(migrations) {
  const declared = byId(migrations)
  const at = new Map(migrations.map((migration, index) => [migration.id, index]))
  const state = new Map()
  const path = []
  const cycles = []

  const visit = (migration) => {
    state.set(migration.id, 'open')
    path.push(migration)
    for (const id of migration.requires) {
      const dependency = declared.get(id)
      if (!dependency) continue
      const seen = state.get(dependency.id)
      if (seen === 'open') {
        cycles.push(path.slice(path.indexOf(dependency)).map((member) => member.id))
      } else if (seen === undefined) {
        visit(dependency)
      }
    }
    path.pop()
    state.set(migration.id, 'closed')
  }

  for (const migration of migrations) {
    if (state.get(migration.id) === undefined) visit(migration)
  }
  if (!cycles.length) return null

  const earliest = (cycle) => Math.min(...cycle.map((id) => at.get(id)))
  const reported = cycles.reduce((best, cycle) => (earliest(cycle) < earliest(best) ? cycle : best))
  const start = reported.indexOf(reported.reduce((best, id) => (at.get(id) < at.get(best) ? id : best)))
  return reported.slice(start).concat(reported.slice(0, start))
}
