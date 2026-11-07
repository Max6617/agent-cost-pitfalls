/**
 * The rollback plan.
 *
 * Undoing a release means running the same steps backwards: the last change is
 * the first one undone. It is built from the plan that was applied, so the
 * rollback lines up with it one step for one step, with the size of each step
 * kept as it was planned.
 *
 * Not every step has an undo. A step whose migration is not reversible is left
 * out and reported instead, in plan order, so that the release notes can say
 * what the rollback does not cover rather than silently pretending it does.
 */

/** The undo steps, newest first, and the ids that have no undo. */
export function rollbackPlan(steps) {
  const reversed = [...steps].reverse()
  return {
    steps: reversed.filter((step) => step.reversible),
    skipped: steps.filter((step) => !step.reversible).map((step) => step.id),
  }
}
