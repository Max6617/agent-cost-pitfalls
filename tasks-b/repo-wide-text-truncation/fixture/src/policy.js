/**
 * The one truncation policy.
 *
 * docs/truncation-policy.md pins the convention; this module pins the numbers.
 * A surface takes its limit from LIMITS and never keeps a constant of its own,
 * so changing a limit is a one-line change here and nothing else.
 */

/** The cut marker: the single-character ellipsis, U+2026. Never '...'. */
export const ELLIPSIS = '…'

/** How far back from the cut, in code points, a word boundary is looked for. */
export const BOUNDARY_WINDOW = 10

/** Per-surface limits, in Unicode code points. */
export const LIMITS = Object.freeze({
  sms: 160,
  push: 120,
  emailSubject: 60,
  logLine: 80,
  tableCell: 24,
})
