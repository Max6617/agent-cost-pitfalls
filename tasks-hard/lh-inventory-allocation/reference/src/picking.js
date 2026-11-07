/**
 * Pick quantities.
 *
 * The pick line works in whole packs. A pack that has been opened has to be
 * closed again before the shelf can be counted, so the rules are stated in
 * packs rather than in units — except for the line the shelf can cover in full,
 * which ships exactly as the customer asked for it.
 */

/**
 * How many units of `requested` come off a shelf that has `free` units on it.
 *
 * `free` is already net of everything that is held or buffered; this function
 * only decides how much of it this one line may take.
 */
export function fillUnits(requested, free, packSize = 1) {
  if (requested <= 0 || free <= 0) return 0
  // the shelf covers the line: it ships exactly as asked
  if (free >= requested) return requested
  // a short fill is trimmed down to whole packs, never rounded up
  return Math.floor(free / packSize) * packSize
}
