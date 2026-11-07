/**
 * Cursor pagination.
 *
 * A page is requested with an opaque `cursor` that means "everything strictly
 * after this position". The position is `(createdAt, id)` — a tuple, because a
 * timestamp alone is not unique and a batch import gives dozens of rows the
 * same millisecond.
 *
 * Two properties the API promises and the implementation has to keep:
 *
 *   - a row that was already served is never served twice
 *   - a row that exists for the whole walk is never skipped, even when other
 *     rows are inserted or deleted between pages
 *
 * Both follow from ordering on the tuple and starting after the tuple, rather
 * than from an offset into a list that keeps changing underneath.
 */

const SEPARATOR = '\u0000'

export { SEPARATOR }

/** Order two rows by creation time. */
export function compareRows(a, b) {
  if (a.createdAt === b.createdAt) return 0
  return a.createdAt < b.createdAt ? -1 : 1
}

/** Sort a copy of the rows into the canonical order. */
export function sortRows(rows) {
  return [...rows].sort(compareRows)
}

/** Encode a position as an opaque cursor. */
export function encodeCursor(row) {
  return Buffer.from(row.createdAt, 'utf8').toString('base64url')
}

/**
 * Decode a cursor.
 *
 * @param {string|undefined|null} cursor
 * @returns {{createdAt: string, id: string}|null} null when unusable
 */
export function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    const createdAt = Buffer.from(String(cursor), 'base64url').toString('utf8')
    if (!createdAt) return null
    return { createdAt, id: '' }
  } catch {
    return null
  }
}

/** Is this row strictly after the cursor position? */
export function isAfter(row, position) {
  if (!position) return true
  return row.createdAt > position.createdAt
}

/**
 * One page.
 *
 * @param {{ rows: object[], cursor?: string, limit?: number }} request
 * @returns {{ items: object[], nextCursor: string|null, hasMore: boolean }}
 */
export function page({ rows, cursor, limit = 2 }) {
  const size = Math.max(1, Number(limit) || 1)
  const position = decodeCursor(cursor)
  const ordered = sortRows(rows).filter((row) => isAfter(row, position))

  const items = ordered.slice(0, size)
  const hasMore = ordered.length > items.length
  const last = items[items.length - 1]

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  }
}

/** Walk every page, for the export job. */
export function walk(rows, limit = 2) {
  const out = []
  let cursor
  for (;;) {
    const result = page({ rows, cursor, limit })
    out.push(...result.items)
    if (!result.hasMore) return out
    cursor = result.nextCursor
  }
}
