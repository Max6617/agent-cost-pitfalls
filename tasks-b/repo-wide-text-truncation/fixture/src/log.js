import { LIMITS, ELLIPSIS } from './policy.js'

/**
 * One line of the service log. Multi-line payloads arrive here already folded
 * to a single line; a line that is too long is cut at a word so the message
 * stays readable in grep output.
 */
export function logLine(message) {
  const limit = LIMITS.logLine
  const points = Array.from(message)
  if (points.length <= limit) return message
  const kept = points.slice(0, limit - ELLIPSIS.length)
  const cut = kept.lastIndexOf(' ')
  const head = cut >= 0 ? kept.slice(0, cut) : kept
  return head.join('') + ELLIPSIS
}
