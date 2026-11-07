/**
 * Destructive operations.
 *
 * Some operations rewrite the table while they hold the lock and leave nothing
 * for the rollback plan to undo, so the release process wants them acknowledged
 * before they are planned at all. docs/operations.md is the catalogue; the list
 * below is its machine-readable copy.
 */
export const DESTRUCTIVE_OPERATIONS = Object.freeze(['drop-column', 'drop-table', 'rewrite-type'])

/** Whether the migration performs an operation the rollback plan cannot undo. */
export function isDestructive(migration) {
  return DESTRUCTIVE_OPERATIONS.includes(migration.operation.kind)
}

/**
 * The destructive steps nobody acknowledged, and the destructive steps that were
 * acknowledged, both in plan order. The acknowledgement is the one the ticket
 * carries; a release manager can also sign off for the whole plan, which the
 * caller passes down in the options.
 */
export function destructiveFindings(steps, options = {}) {
  const errors = []
  const warnings = []
  const signedOff = new Set(options.acknowledgements ?? [])

  for (const step of steps) {
    if (!step.destructive) continue
    if (step.acknowledgement || signedOff.has(step.id)) {
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
