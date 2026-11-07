import { LIMITS, ELLIPSIS } from './policy.js'

/**
 * One cell of the admin grid. Columns are fixed width so the grid can align
 * without measuring twice; every cell is cut at exactly the same offset.
 */
export function tableCell(value) {
  const limit = LIMITS.tableCell
  const points = Array.from(value)
  if (points.length <= limit) return value
  return points.slice(0, limit - ELLIPSIS.length).join('') + ELLIPSIS
}
