/**
 * The rollback plan.
 *
 * Undoing a release means running the same steps backwards: the last change is
 * the first one undone. It is built from the plan that was applied, so the
 * rollback lines up with it one step for one step, with the size of each step
 * kept as it was planned.
 */

/** The undo steps, newest first. */
export function rollbackPlan(steps) {
  const reversed = [...steps].reverse()
  return {
    steps: reversed,
    skipped: [],
  }
}
