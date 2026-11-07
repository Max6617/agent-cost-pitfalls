/**
 * The shared truncator.
 *
 * Every user-facing surface shortens text with truncate() and a limit from
 * src/policy.js - one convention, one implementation. The convention is pinned
 * in docs/truncation-policy.md; when this file and that document ever disagree,
 * the document is right.
 */
import { ELLIPSIS, BOUNDARY_WINDOW } from './policy.js'

/** The length of a string as the convention counts it: Unicode code points. */
export function lengthOf(text) {
  return Array.from(text).length
}

/**
 * Shorten `text` to at most `limit` code points.
 *
 * Text that fits is returned unchanged. Otherwise one code point is reserved
 * for the ellipsis, and when a space sits inside the last BOUNDARY_WINDOW code
 * points of what would be kept, the cut moves back to the last such space.
 */
export function truncate(text, limit) {
  const points = Array.from(text)
  if (points.length <= limit) return text
  if (limit <= 0) return ''
  const kept = points.slice(0, limit - ELLIPSIS.length)
  return kept.slice(0, boundaryInWindow(kept)).join('') + ELLIPSIS
}

/**
 * The index just past the content to keep: the last space inside the window,
 * or the whole kept prefix when the window holds no space.
 */
function boundaryInWindow(keptPoints) {
  const from = Math.max(0, keptPoints.length - BOUNDARY_WINDOW)
  for (let i = keptPoints.length - 1; i >= from; i--) {
    if (keptPoints[i] === ' ') return i
  }
  return keptPoints.length
}
