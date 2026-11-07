/**
 * matrix-watchdog.mjs - when is a RUNNING matrix stuck? One rule, in one place, testable.
 *
 * THE FIRST DEFECT (2026-10-04). Two consecutive attempts to resume the hard-suite pilot were
 * killed about fifteen seconds after they started, and collect.mjs reported:
 *
 *     *** STOPPING THE MATRIX: no run record for 12 minutes ***
 *
 * The message was false: there had been no run record for SIX HOURS, which is the NORMAL state of
 * a matrix resumed the morning after a reboot. The silence clock was seeded from the mtime of the
 * existing runs.jsonl rather than from this invocation's own start, so `now - lastRunTs` was already
 * 6h11m on the very first 15-second tick. A resumed matrix could never run.
 *
 * THE SECOND DEFECT, introduced by the first fix and caught five minutes later. The gateway rule took
 * a boolean called `gatewayQuiet`, and the caller passed it the result of a helper that returned TRUE
 * WHEN THE LOG WAS FRESH - the name was inverted relative to its body. So the rule killed the matrix
 * at exactly the five-minute mark of a run that was making requests, and had already written two
 * cells. **It now takes `gatewayIdleMs`, a DURATION.** A duration cannot be inverted by a caller who
 * did not read the helper it came from, which is the property that matters: the polarity of a boolean
 * is invisible at the call site, and this cost a matrix run to learn.
 *
 * THRESHOLDS ARE MEASURED, NOT CHOSEN. Both defaults are pinned by tests against the shipped data:
 *   * the slowest single hard cell measured is 1200 s, so the record-silence threshold is 25 min;
 *   * the largest gap between consecutive gateway requests in a healthy 4,987-request matrix is 128 s
 *     (p99 = 21 s), so the 5-minute gateway threshold has more than twice the observed margin.
 */

import { statSync } from 'node:fs'

/** Slowest single cell measured on the hard suite (results/hardpilot-ds-full, 2026-10-04). */
export const SLOWEST_OBSERVED_CELL_SECONDS = 1200

/** Largest gap between consecutive gateway requests in a healthy matrix (cmutjmthf, 4,987 requests). */
export const LONGEST_OBSERVED_REQUEST_GAP_SECONDS = 128

/** Default record-silence threshold. Must stay above the slowest cell; see the header. */
export const DEFAULT_MATRIX_SILENCE_MIN = 25

/**
 * The clock the record-silence rule runs on. Seeded from THIS invocation, never from a file's age.
 * @param {{startedAt: number}} o
 */
export function silenceClock ({ startedAt }) {
  return { lastRunTs: startedAt }
}

/**
 * How long the gateway log has been untouched, in milliseconds. A DURATION, deliberately: see the
 * header for what a boolean named `gatewayQuiet` cost. A log that cannot be read returns 0 - the
 * watchdog must never kill a matrix because of a stat failure.
 */
export function gatewayIdleMs (logPath, now = Date.now()) {
  try { return Math.max(0, now - statSync(logPath).mtimeMs) } catch { return 0 }
}

/**
 * @param {{now: number, lastRunTs: number, gatewayIdleMs: number, matrixSilenceMin: number,
 *          gwSilenceMin: number, complete: boolean}} o
 * @returns {string|null} the reason to stop the matrix, or null to let it run
 */
export function silenceVerdict (o) {
  if (o.complete) return null   // every cell on disk: nothing left to be stuck on
  if (o.now - o.lastRunTs > o.matrixSilenceMin * 60000) {
    return 'no run record for ' + o.matrixSilenceMin + ' minutes'
  }
  if (o.gatewayIdleMs > o.gwSilenceMin * 60000) {
    return 'no gateway request for ' + o.gwSilenceMin + ' minutes'
  }
  return null
}
