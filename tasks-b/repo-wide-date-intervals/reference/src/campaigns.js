/**
 * Promotional rate plans. A plan is { start, end } - its active window -
 * and only the nights of a stay that fall inside the window price at the
 * plan rate.
 */
import { clamp, duration } from './intervals.js'

/** The part of `stay` the plan applies to, or null when there is none. */
export function effectiveWindow(plan, stay) {
  return clamp(stay, plan)
}

/** How many nights of `stay` price at the plan rate. */
export function planNights(plan, stay) {
  const window = effectiveWindow(plan, stay)
  return window ? duration(window) : 0
}
