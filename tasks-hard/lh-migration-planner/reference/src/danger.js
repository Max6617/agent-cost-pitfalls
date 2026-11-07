/**
 * Destructive operations.
 *
 * Some operations rewrite the table while they hold the lock and leave nothing
 * for the rollback plan to undo, so the release process wants them acknowledged
 * before they are planned at all. docs/operations.md is the catalogue; the list
 * below is its machine-readable copy.
 */
export const DESTRUCTIVE_OPERATIONS = Object.freeze(['drop-column', 'drop-table', 'rewrite-type'])

/** Operation kinds come from the tickets, so they are compared normalised. */
const normalize = (kind) => String(kind ?? '').trim().toLowerCase()

/** Whether the migration performs an operation the rollback plan cannot undo. */
export function isDestructive(migration) {
  return DESTRUCTIVE_OPERATIONS.includes(normalize(migration.operation.kind))
}

/**
 * The destructive steps nobody acknowledged, and the destructive steps that were
 * acknowledged, both in plan order.
 *
 * The acknowledgement is the one the ticket carries, which names the operation
 * it acknowledges, or one the release manager gave for the whole plan, which is
 * a list of operation kinds too. An acknowledgement for something else is not an
 * acknowledgement of this operation.
 */
export function destructiveFindings(steps, options = {}) {
  const errors = []
  const warnings = []
  const signedOff = new Set((options.acknowledgements ?? []).map(normalize))

  for (const step of steps) {
    if (!step.destructive) continue
    const kind = normalize(step.kind)
    const acknowledged = signedOff.has(kind) || normalize(step.acknowledgement) === kind

    if (acknowledged) {
      warnings.push({
        code: 'acknowledged-destructive',
        migration: step.id,
        detail: step.kind + ' is destructive and was acknowledged',
      })
    } else {
      errors.push({
        code: 'unacknowledged-destructive',
        migration: step.id,
        detail: step.kind + ' is destructive and nobody acknowledged it',
      })
    }
  }
  return { errors, warnings }
}
