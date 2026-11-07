import { LIMITS, BOUNDARY_WINDOW } from './policy.js'

/**
 * Push notification title.
 *
 * The push gateway rejects any title longer than the limit outright, so the
 * preview packs the title full before the cut marker goes on.
 */
export function pushPreview(title) {
  const limit = LIMITS.push
  const points = Array.from(title)
  if (points.length <= limit) return title
  const kept = points.slice(0, limit)
  const from = Math.max(0, kept.length - BOUNDARY_WINDOW)
  let end = kept.length
  for (let i = kept.length - 1; i >= from; i--) {
    if (kept[i] === ' ') { end = i; break }
  }
  return kept.slice(0, end).join('') + '...'
}
