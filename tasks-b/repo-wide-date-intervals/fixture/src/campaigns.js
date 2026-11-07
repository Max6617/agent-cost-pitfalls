/**
 * Promotional rate plans. A plan is { start, end } - its active window -
 * and only the nights of a stay that fall inside the window price at the
 * plan rate.
 */

/** The part of `stay` the plan applies to. */
export function effectiveWindow(plan, stay) {
  const start = Math.max(stay.start, plan.start)
  const end = Math.min(stay.end, plan.end)
  return { start, end }
}

/** How many nights of `stay` price at the plan rate. */
export function planNights(plan, stay) {
  const window = effectiveWindow(plan, stay)
  return window.end - window.start
}
