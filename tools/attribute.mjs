import { readFileSync } from 'node:fs'

/**
 * attribute — the single definition of how a run is identified in the gateway log.
 *
 * The harness is ALWAYS the first segment after "exp-"; the runId is everything
 * after it. Do only that.
 *
 * This exists because the gateway originally used a regex,
 * /^exp-(.+?)-(r[0-9a-z_.-]+)$/, which took the SHORTEST harness for which the
 * next segment began with "r". Any run id containing an r-initial segment split in
 * the wrong place - fetch-heavy-semver-RANGES became harness
 * "opencode-<matrix>-opencode-fetch-heavy-semver", runId "ranges-...". Nothing
 * failed: requests returned 200, runs reported success, and the usage filed under
 * a harness no experiment queried, so the task measured zero cost and looked fine.
 * 632 records in one session were mis-filed this way.
 *
 * Every tool that joins runs to usage must use THIS function, so a fix in one place
 * cannot leave another still splitting differently.
 */

/** Parse "exp-<harness>-<runId>" from a raw synthetic key. */
export function parseSyntheticKey(syntheticKey) {
  const raw = String(syntheticKey ?? '')
  if (!raw.startsWith('exp-')) return null
  const parts = raw.slice(4).split('-')
  return { harness: parts[0] || 'unknown', runId: parts.slice(1).join('-') || 'unset' }
}

/**
 * Index gateway records by runId, re-deriving the identity from syntheticKey where
 * present. Records written by an older, buggy gateway are recovered rather than
 * discarded, so historical data does not have to be re-collected.
 */
export function indexByRun(gatewayRecords) {
  const byRun = new Map()
  let recovered = 0
  for (const r of gatewayRecords) {
    const a = parseSyntheticKey(r.syntheticKey)
    const runId = a?.runId ?? r.runId
    const harness = a?.harness ?? r.harness
    if (a && (a.runId !== r.runId || a.harness !== r.harness)) recovered++
    if (!runId) continue
    if (!byRun.has(runId)) byRun.set(runId, [])
    byRun.get(runId).push({ ...r, harness, runId })
  }
  return { byRun, recovered }
}

/** Read a gateway jsonl file into memory, tolerating blank and partial lines. */
export function readGateway(path) {
  const out = []
  for (const l of readFileSync(path, 'utf8').split('\n')) {
    if (!l.trim()) continue
    try { out.push(JSON.parse(l)) } catch {}
  }
  return out
}
