/**
 * Migration steps.
 *
 * A step is `{ id, after: string[] }`. Steps run in an order where every step
 * comes after everything it lists. The order must be:
 *
 *   - valid: no step before something it depends on
 *   - complete: every step appears exactly once
 *   - stable: ties are broken by the order the steps were declared, so two
 *     runs of the same input produce the same plan and a review is meaningful
 *
 * A cycle is reported with the steps involved rather than throwing from deep
 * inside the walk, because the person reading the error is the person who has
 * to break the cycle.
 */

/**
 * Order the steps.
 *
 * @param {{ id: string, after?: string[] }[]} steps
 * @returns {{ order: string[], unknown: {step:string,after:string}[], cycle: string[] }}
 */
export function order(steps) {
  const known = new Set(steps.map((s) => s.id))
  const unknown = []
  for (const step of steps) {
    for (const need of step.after ?? []) if (!known.has(need)) unknown.push({ step: step.id, after: need })
  }

  const placed = new Set()
  const order = []
  const remaining = [...steps]

  for (;;) {
    const ready = remaining.filter((step) => (step.after ?? []).every((need) => placed.has(need)))
    if (!ready.length) break

    // Declaration order breaks every tie, and only ties.
    const next = ready.sort((a, b) => steps.indexOf(a) - steps.indexOf(b))[0]
    placed.add(next.id)
    order.push(next.id)
    remaining.splice(remaining.indexOf(next), 1)
  }

  return { order, unknown, cycle: remaining.map((s) => s.id) }
}

/** The order, or a thrown explanation. */
export function mustOrder(steps) {
  const result = order(steps)
  if (result.unknown.length) {
    throw new Error('unknown dependency: ' + result.unknown[0].step + ' after ' + result.unknown[0].after)
  }
  if (result.cycle.length) {
    throw new Error('unorderable steps')
  }
  return result.order
}

/** Steps that depend on nothing, so they can start immediately. */
export function isolated(steps) {
  return steps.filter((s) => !(s.after ?? []).length).map((s) => s.id)
}
