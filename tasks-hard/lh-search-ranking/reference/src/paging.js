/**
 * Paging.
 *
 * The caller asks for a window of the ranked list and gets it back together
 * with the numbers the interface needs to render its pager.
 */
export function resolveWindow(state, options = {}) {
  const { defaultLimit, maxLimit } = state.paging
  const askedLimit = Number(options.limit ?? defaultLimit)
  const askedOffset = Number(options.offset ?? 0)
  const limit = Math.min(
    Math.max(Number.isFinite(askedLimit) ? Math.trunc(askedLimit) : defaultLimit, 1),
    maxLimit,
  )
  const offset = Math.max(Number.isFinite(askedOffset) ? Math.trunc(askedOffset) : 0, 0)
  return { limit, offset }
}

export function paginate(state, ranked, window) {
  const { limit, offset } = window
  const hits = ranked.slice(offset, offset + limit)
  return { total: ranked.length, limit, offset, hits }
}
