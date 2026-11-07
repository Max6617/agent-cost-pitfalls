/**
 * exit-guard.mjs - the guard for a runner that completed the matrix and never exits.
 *
 * WHY IT IS SEPARATE FROM matrix-watchdog.mjs. That module's two rules infer "stuck" from SILENCE,
 * and both stand down once the matrix is complete (`complete` in silenceVerdict), because a finished
 * runner spends minutes doing LOCAL work - an incremental backup of a 30 MB tree, a snapshot, a
 * commit - that never touches the gateway. On 2026-10-02 that stand-down was written to stop the
 * watchdog killing a healthy matrix mid-backup.
 *
 * The other half was never covered: complete, and the runner never exits at all. On 2026-10-07 luna
 * wrote its 800th cell at 19:24:50Z, its runner hung with no child processes, and the collector waited
 * 2 h 45 min printing dots. Every run was on disk and committed; the pipeline simply never advanced,
 * and no alert fired, because silence was the only thing being watched.
 *
 * This guard is therefore deliberately narrow: it CANNOT fire before completion, so it cannot
 * reproduce the kill it exists alongside. And it keys on the LATER of completion and the last record,
 * so a retried cell landing after completion restarts the clock.
 */

/**
 * @param {{now: number, completeSinceMs: number|null, lastRunTs: number, stallMs: number}} a
 * @returns {string|null} a reason to kill, or null to leave the runner alone
 */
export function exitGuardVerdict ({ now, completeSinceMs, lastRunTs, stallMs }) {
  if (completeSinceMs == null) return null
  const silentSince = Math.max(completeSinceMs, lastRunTs || 0)
  const silentMs = now - silentSince
  if (silentMs <= stallMs) return null
  const mins = (silentMs / 60000).toFixed(1)
  return 'the matrix is complete (' + 'every cell recorded' + ') but the runner has not exited in ' + mins +
    ' min; killing it. The runs are on disk and committed, and the verify stage re-checks them.'
}