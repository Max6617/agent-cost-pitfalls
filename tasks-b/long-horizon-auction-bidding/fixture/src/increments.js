/**
 * The minimum rise over the current high bid.
 *
 * The table is the one in docs/auction-rules.md: ascending floors, each row
 * naming the smallest amount a new bid must add once the standing bid is in
 * that bracket. The bracket is chosen by the standing bid, before the new bid
 * is considered.
 */
export function incrementFor(current, table) {
  let i = 0
  while (i < table.length && table[i].min <= current) i += 1
  return table[Math.min(i, table.length - 1)].increment
}
