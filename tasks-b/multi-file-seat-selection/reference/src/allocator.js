/**
 * allocator.js - find a block for a group.
 *
 * A group is always seated in one row, in one contiguous block of a single
 * seat kind; it is never split across rows and a block never mixes kinds.
 * docs/seating-rules.md pins when accessible seats may be offered to a
 * general request.
 */
import { isContiguous } from './venue.js'
import { seatLabel } from './labels.js'
import { rankBlocks } from './scoring.js'

/** Every block of `size` free seats of `kind` that any row can offer. */
export function candidateBlocks(venue, { size, blocked, kind }) {
  const blocks = []
  for (const row of venue.rows) {
    const free = new Set(
      row.seats
        .filter((s) => s.kind === kind && !blocked.has(seatLabel(row.id, s.n)))
        .map((s) => s.n),
    )
    for (const n of free) {
      const run = []
      for (let k = 0; k < size; k++) run.push(n + k)
      if (run.every((m) => free.has(m)) && isContiguous(row, run)) {
        blocks.push({ row: row.id, seats: run })
      }
    }
  }
  return blocks
}

export function allocate(venue, store, { size, needsAccessible = false } = {}, now) {
  if (!Number.isInteger(size) || size < 1) return { status: 'invalid-request' }
  const blocked = store.blockedSeats(now)
  const kind = needsAccessible ? 'accessible' : 'standard'
  let blocks = candidateBlocks(venue, { size, blocked, kind })
  if (blocks.length === 0 && !needsAccessible) {
    blocks = candidateBlocks(venue, { size, blocked, kind: 'accessible' })
  }
  if (blocks.length === 0) return { status: 'no-availability' }
  const best = rankBlocks(venue, blocks)[0]
  return { status: 'ok', block: best, seats: best.seats.map((n) => seatLabel(best.row, n)) }
}
