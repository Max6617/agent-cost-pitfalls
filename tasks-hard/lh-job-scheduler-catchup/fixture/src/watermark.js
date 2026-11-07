/**
 * The watermark.
 *
 * The watermark is the boundary below which a job's runs have been dealt with:
 * every scheduled instant at or before it is settled, so the next tick starts
 * looking strictly after it. Moving it too far forward is how runs get lost, and
 * moving it backwards would replay runs that were already accounted for.
 */

/**
 * @param {number} watermark the boundary before the tick
 * @param {number} now the instant the tick was taken at
 * @param {number[]} candidates the scheduled instants the tick looked at, ascending
 * @param {number[]} owed the candidates that could not be settled this tick
 * @returns {number} the boundary after the tick
 */
export function advanceWatermark(watermark, now, candidates, owed) {
  const frontier = owed.length ? owed[0] : now
  return frontier > watermark ? frontier : watermark
}
