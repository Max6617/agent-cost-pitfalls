/**
 * Plan order.
 *
 * A migration runs after everything it requires. The ticket export is written in
 * the order the changes were proposed, and the release notes follow that order,
 * so migrations that are ready at the same time keep it.
 */

/**
 * Place the migration that was declared first among those whose requirements are
 * all placed already, and keep going until nothing is left. Ties therefore
 * resolve to declared order, and a migration is never placed in front of
 * something it requires however late that something was declared.
 *
 * A cycle leaves migrations that can never be placed; there is no order to give
 * for those, and the caller reports the cycle instead of a plan.
 */
export function orderMigrations(migrations) {
  const placed = new Set()
  const remaining = [...migrations]
  const order = []

  while (remaining.length) {
    const at = remaining.findIndex((migration) => migration.requires.every((id) => placed.has(id)))
    if (at === -1) break
    const [migration] = remaining.splice(at, 1)
    order.push(migration)
    placed.add(migration.id)
  }
  return order
}
