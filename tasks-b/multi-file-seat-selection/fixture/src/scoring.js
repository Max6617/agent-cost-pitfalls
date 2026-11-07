/**
 * scoring.js - best available.
 *
 * Every candidate block gets a key and lower keys are better; keys are
 * compared element by element and the first difference decides.
 * docs/seating-rules.md pins which components make up the key and the order
 * they are compared in.
 */
import { rowIndex, venueCenter2 } from './venue.js'

export function blockKey(venue, block) {
  const lo = Math.min(...block.seats)
  const hi = Math.max(...block.seats)
  const offset2 = Math.abs(lo + hi - venueCenter2(venue))
  return [rowIndex(venue, block.row), offset2, lo, block.row]
}

export function compareKeys(a, b) {
  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  return 0
}

export function rankBlocks(venue, blocks) {
  return [...blocks].sort((x, y) => compareKeys(blockKey(venue, x), blockKey(venue, y)))
}
