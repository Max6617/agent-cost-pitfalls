/** Small comparators shared by the modules. */

/** Order intervals by their first day, then by their last. */
export function byStartThenEnd(a, b) {
  return a.start - b.start || a.end - b.end
}
