/**
 * venue.js - the seat map.
 *
 * A venue is a list of rows, front row first. Seats in a row are numbered
 * from 1 and the numbering runs straight across the row; an aisle is recorded
 * separately, as "after seat N". Seats either side of an aisle are not
 * adjacent even though their numbers are consecutive.
 *
 * Row specs take `count` seats, an `aislesAfter` list and an `accessible`
 * list of seat numbers (every unlisted seat is 'standard').
 */
export function makeRow({ id, count, aislesAfter = [], accessible = [] }) {
  const acc = new Set(accessible)
  const seats = []
  for (let n = 1; n <= count; n++) {
    seats.push({ n, kind: acc.has(n) ? 'accessible' : 'standard' })
  }
  return { id, seats, aislesAfter: [...aislesAfter].sort((a, b) => a - b) }
}

export function createVenue(spec) {
  const rows = spec.rows.map((r) => (r.seats ? r : makeRow(r)))
  return { rows }
}

export function rowIndex(venue, rowId) {
  return venue.rows.findIndex((r) => r.id === rowId)
}

export function seatAt(venue, rowId, n) {
  const row = venue.rows.find((r) => r.id === rowId)
  if (!row) return null
  return row.seats.find((s) => s.n === n) ?? null
}

/**
 * The venue's centre line, doubled so the arithmetic stays in integers: the
 * middle of the widest row (the front-most row, if several rows tie).
 */
export function venueCenter2(venue) {
  let widest = venue.rows[0]
  for (const row of venue.rows) {
    if (row.seats.length > widest.seats.length) widest = row
  }
  return 1 + widest.seats.length
}

/** Two seats in one row are adjacent when they sit directly next to each other. */
export function areAdjacent(row, a, b) {
  return Math.abs(a - b) === 1 && !row.aislesAfter.includes(Math.min(a, b))
}

/** Whether a set of seat numbers forms one contiguous block within the row. */
export function isContiguous(row, seatNumbers) {
  const sorted = [...seatNumbers].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}
