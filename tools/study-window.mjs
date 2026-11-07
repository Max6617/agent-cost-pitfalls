/**
 * study-window.mjs - the instant each CLOSED matrix's data was frozen.
 *
 * WHY THIS EXISTS. On 2026-10-04 a runaway openhands process from the finished luna matrix was still
 * posting to a stale gateway 29 hours after sign-off, and appended 15 records to
 * results/cmure98qw-openai-gateway.jsonl. Those records are genuine and stay on disk. They are
 * excluded from the analysis because their NUMBER depends on when the runaway was stopped: an hour
 * later there would have been more, and a per-cell cost that grows with the lifetime of an unattended
 * process is not a measurement of the run.
 *
 * The cut-off is the instant the signed-off artifact was built - after every legitimate record and
 * before the first drift record. Excluded records are COUNTED and reported; nothing is dropped
 * silently. A matrix not listed here has no cut-off, so a future collection can never be silently
 * ignored by this file.
 *
 * Full reasoning: notes/defects/EVIDENCE-DRIFT-2026-10-04.md.
 */
export const CLOSED_MATRICES = {
  'luna-full': {
    cutoff: '2026-10-04T06:01:57.000Z',
    why: 'runaway openhands process appended 15 records after sign-off; see notes/defects/EVIDENCE-DRIFT-2026-10-04.md',
  },
}

/** The declared cut-off for a dataset, or null when the dataset is still open. */
export function cutoffFor (datasetId) {
  return CLOSED_MATRICES[datasetId]?.cutoff ?? null
}

/** Is this record at or after the dataset's cut-off? An open dataset never is. */
export function afterCutoff (datasetId, ts) {
  const c = cutoffFor(datasetId)
  if (!c || !ts) return false
  const t = Date.parse(ts)
  return Number.isFinite(t) && t >= Date.parse(c)
}

/**
 * Gateway logs belonging to a pipeline run that the status file names. Such a log cannot be a
 * signed-off input: it is still being appended to while the manifest that attests it is written.
 * On 2026-10-04 the artifact manifest checksummed the hard-suite pilot's log mid-run, and --verify
 * failed minutes later on a file that was doing exactly what it should be doing.
 *
 * Takes the PARSED status object, so the rule is testable without a live pipeline.
 */
export function inFlightLogs (status, repoRoot = process.cwd()) {
  const out = new Set()
  const gateways = Array.isArray(status?.gateways) ? status.gateways : []
  for (const g of gateways) {
    if (!g || typeof g.log !== 'string' || !g.log) continue
    out.add(g.log.replace(/\\/g, '/').toLowerCase())
    // also match on the basename, because the status file may hold an absolute path
    const base = g.log.replace(/\\/g, '/').split('/').pop().toLowerCase()
    if (base) out.add(base)
  }
  return out
}
