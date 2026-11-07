/**
 * labels.js - seat labels.
 *
 * A seat is labelled '<row><number>': 'C12' is row C, seat 12. Row ids are
 * upper-case letters, seat numbers start at 1. Labels are how holds and
 * bookings refer to seats across the public surface.
 */
export function seatLabel(rowId, n) {
  return rowId + String(n)
}

export function parseSeat(label) {
  const m = /^([A-Z]+)([1-9][0-9]*)$/.exec(label ?? '')
  if (!m) return null
  return { row: m[1], n: Number(m[2]) }
}
