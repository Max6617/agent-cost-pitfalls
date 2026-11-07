/**
 * search.js - the back-office search box.
 *
 * A row matches when the query appears in its title or its body, case
 * insensitively; an empty query matches everything. The hits then come in the
 * shared listing order, id key included, so a tie never depends on the order
 * the indexer saw the rows in.
 */
import { sortListable } from './ordering.js'

export function searchDocs(rows, query = '') {
  const q = String(query).trim().toLowerCase()
  const matched = q === '' ? rows : rows.filter((row) => matches(row, q))
  return sortListable(matched)
}

function matches(row, q) {
  return (
    String(row.title ?? '').toLowerCase().includes(q) ||
    String(row.body ?? '').toLowerCase().includes(q)
  )
}
