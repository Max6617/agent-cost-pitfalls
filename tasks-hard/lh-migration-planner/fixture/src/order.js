/**
 * Plan order.
 *
 * A migration runs after everything it requires. The ticket export is written in
 * the order the changes were proposed, and the release notes follow that order,
 * so migrations that are ready at the same time keep it.
 */

/**
 * The declared position a migration waits for: the earliest position among the
 * migrations it requires, or its own position when it requires nothing.
 */
function anchor(migration, at) {
  const positions = migration.requires.map((id) => at.get(id)).filter((position) => position !== undefined)
  if (!positions.length) return at.get(migration.id)
  return Math.min(...positions)
}

/** A new array in plan order; the input is not modified. */
export function orderMigrations(migrations) {
  const at = new Map(migrations.map((migration, index) => [migration.id, index]))
  return [...migrations].sort((a, b) => anchor(a, at) - anchor(b, at))
}
