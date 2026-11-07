/**
 * search.js - the back-office search box.
 *
 * A row matches when the query appears in its title or its body, case
 * insensitively; an empty query matches everything. The hits are then sorted
 * by priority and age. The sort is stable, so two hits that compare equal
 * keep the order the indexer happened to see them in - which reads naturally
 * enough on screen.
 */
export function searchDocs(rows, query = '') {
  const q = String(query).trim().toLowerCase()
  const matched = q === '' ? rows.slice() : rows.filter((row) => matches(row, q))
  return matched.sort(compareHits)
}

function matches(row, q) {
  return (
    String(row.title ?? '').toLowerCase().includes(q) ||
    String(row.body ?? '').toLowerCase().includes(q)
  )
}

function compareHits(a, b) {
  return (
    descNullsLast(a.priority, b.priority) ||
    ascNullsLast(a.createdAt, b.createdAt)
  )
}

function ascNullsLast(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  return x < y ? -1 : x > y ? 1 : 0
}

function descNullsLast(x, y) {
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  return x > y ? -1 : x < y ? 1 : 0
}
