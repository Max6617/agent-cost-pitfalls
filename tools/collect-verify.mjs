/**
 * collect-verify.mjs - the verify stage's per-run view of the gateway, and rule 9 in BOTH halves.
 *
 * THE DEFECT. collect.mjs's verify stage refused a matrix whenever a run had spent nothing and did
 * not carry an `error` record:
 *
 *     const unexplained = runs.filter((r) => !r.error && !((spent.get(r.runId) ?? 0) > 0))
 *
 * The scan behind it (spendByRun) asked the gateway log one question - what did this runId cost? -
 * and rule 9's SECOND half was never asked at all. PRE-REGISTRATION rule 9 excludes an unsolved run
 * when EITHER its own output names an infrastructure fault OR it reached the provider zero times /
 * every request it made returned 4xx/5xx. tools/exclusions.mjs owns that rule (classifyByStatus /
 * exclusionVerdict) and tools/cost-panel.mjs already routes every record through it; the collector
 * did not. On results/batchb-haiku-full/runs.jsonl the Anthropic monthly account limit refused
 * every request of 447 runs from 02:18Z on: the analysis excluded all 447 (312 by TEXT, 135 by
 * STATUS) while the collector called 444 of them "ZERO-COST ... with no error record" and refused
 * the sign-off. Two layers, one dataset, opposite verdicts
 * (notes/defects/INCIDENT-haiku-account-limit-2026-10-09.md).
 *
 * ONE SCAN, THREE ANSWERS. The gateway log is large, and it is the only place usage, tokens and
 * request status live, so it is read once per matrix and indexed once, by the study's single
 * identity function (indexByRun in tools/attribute.mjs). Every gateway*.jsonl in the run root is
 * scanned, not just the current matrix's log: a resumed matrix gets a new matrix id and therefore a
 * new log, while the earlier runs' records stay in the old one - reading only the current log would
 * flag every already-complete run.
 *
 * THE RULE IS IMPORTED, NEVER COPIED. rule9Exclusions calls exclusionVerdict and reports which
 * clause fired. "A backstop that is copied is not a backstop" (tools/exclusions.mjs).
 *
 * THE SIGN-OFF COUNT AND THE ANALYSIS POPULATION ARE NOT THE SAME NUMBER. describeCells counts
 * RECORDS - every planned cell of batchb-haiku has one - while the analysis carries only records
 * that rule 9 admits AND that hold usable usage. For haiku that is 353 of 800 cells, 206 solved =
 * 58.4%, against the record-level 206 of 800 = 25.8%. carriedSummary reproduces the analysis
 * population from the same gateway scan and describeCarried reports it beside the sign-off, so the
 * number that enters the record cannot be read as the number the analysis uses.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readGateway, indexByRun } from './attribute.mjs'
import { costOf } from './prices.mjs'
import { exclusionVerdict } from './exclusions.mjs'
import { countCells } from './cell-counts.mjs'

/**
 * One scan of every gateway log under `root`.
 *
 *   spent          runId -> USD, priced from the LOGGED model and the archived usage, never from
 *                  the gateway's own cost.billedUsd (see the note in the spend meter)
 *   tokensByRun    runId -> fresh + created + hit + out tokens; the analysis's "usable usage" test
 *   requestsByRun  runId -> [{status}] in log order, for rule 9's status half
 *
 * `runIds` limits what is kept in memory; `files` limits what is read (tests, or a known shard).
 * Records are attributed by indexByRun, so a record the old gateway mis-filed is recovered rather
 * than dropped - and a second scan for the status half is never needed.
 */
export function scanGatewayRuns (root, { runIds = null, files = null } = {}) {
  const spent = new Map()
  const tokensByRun = new Map()
  const requestsByRun = new Map()
  let names = files
  if (!names) {
    try { names = readdirSync(root).filter((f) => /gateway.*\.jsonl$/.test(f)) } catch { names = [] }
  }
  let read = 0
  let records = 0
  for (const f of names) {
    let parsed
    try { parsed = readGateway(join(root, f)) } catch { continue }
    read++
    records += parsed.length
    const { byRun } = indexByRun(parsed)
    for (const [runId, list] of byRun) {
      if (runIds && !runIds.has(runId)) continue
      const reqs = requestsByRun.get(runId) ?? []
      let tokens = tokensByRun.get(runId) ?? 0
      for (const o of list) {
        reqs.push({ status: o.status })
        // The token arithmetic is cost-panel.mjs's, so that "carried" means ONE thing in both
        // tools: hit = cacheHitTokens ?? 0, miss = cacheMissTokens ?? inputTokens - hit.
        const u = o.usage ?? {}
        const hit = u.cacheHitTokens ?? 0
        const miss = u.cacheMissTokens ?? Math.max(0, (u.inputTokens ?? 0) - hit)
        tokens += miss + (u.cacheCreationTokens ?? 0) + hit + (u.outputTokens ?? 0)
        if (o.usage && o.model) spent.set(runId, (spent.get(runId) ?? 0) + costOf(o.model, o.usage))
      }
      tokensByRun.set(runId, tokens)
      requestsByRun.set(runId, reqs)
    }
  }
  return { spent, tokensByRun, requestsByRun, files: read, records }
}

/**
 * Rule 9 applied to every record of a matrix, with the clause that fired.
 *
 * `records` is every excluded RECORD (identity: the same objects from `runs`).
 * `statusRecords` is the subset excluded by the STATUS clause. The distinction is load-bearing for
 * the FAILURE RECORDS line: a textual exclusion - a launch failure with no runId, say - is still a
 * failure whose cell needs a re-run, while a run whose every request failed measured nothing and
 * cannot be fixed by editing anything.
 */
export function rule9Exclusions (runs, requestsByRun) {
  const records = new Set()
  const statusRecords = new Set()
  let text = 0
  let status = 0
  let noRequests = 0
  for (const r of runs) {
    const v = exclusionVerdict(r, requestsByRun.get(r.runId) ?? [])
    if (!v.excluded) continue
    records.add(r)
    if (v.half === 'status') {
      status++
      statusRecords.add(r)
      if (v.cause === 'no-requests') noRequests++
    } else {
      text++
    }
  }
  return { count: records.size, text, status, noRequests, records, statusRecords }
}

/** The verify line. Both clauses are named so a reader can add excluded + carried on sight. */
export function describeRule9Exclusions (ex) {
  return 'rule 9 exclusions: ' + ex.count + ' (text ' + ex.text + ' / status ' + ex.status +
    ', of which no-requests ' + ex.noRequests + ')'
}

/**
 * The runs the verify stage must still refuse on: spent nothing, no error record, and rule 9 does
 * not explain them. A solved run is never in `exclusions` (the rule's own solved guard is first
 * in exclusionVerdict), so a solved run that spent nothing stays here - that is a data anomaly.
 */
export function unexplainedZeroCost (runs, { spent, exclusions }) {
  const out = []
  for (const r of runs) {
    if (r.error) continue
    if ((spent.get(r.runId) ?? 0) > 0) continue
    if (exclusions.records.has(r)) continue
    out.push(r)
  }
  return out
}

/**
 * The population the ANALYSIS carries, from the same scan: rule 9 admits the record AND its
 * gateway usage holds at least one token (cost-panel.mjs counts noUsage and zeroUsage as
 * measured-nothing). `admittedWithoutUsage` closes the arithmetic:
 *     runs = rule-9 excluded + admitted without usable usage + carried.
 */
export function carriedSummary (runs, { exclusions, tokensByRun }, planned = null) {
  const carried = runs.filter((r) => !exclusions.records.has(r) && (tokensByRun.get(r.runId) ?? 0) > 0)
  const cc = countCells(carried, { planned })
  return {
    records: carried.length,
    cells: cc.cells,
    solvedCells: cc.solvedCells,
    absent: cc.absent,
    solveRate: cc.cells ? cc.solvedCells / cc.cells : NaN,
    admittedWithoutUsage: runs.length - exclusions.count - carried.length,
  }
}

/** The analysis-population line, printed beside the record-level sign-off. */
export function describeCarried (c, planned) {
  const pct = c.cells ? (100 * c.solvedCells / c.cells).toFixed(1) : '0.0'
  return 'CARRIED (the analysis population): ' + c.cells + '/' + planned + ' cells, ' +
    c.solvedCells + ' solved (' + pct + '%)'
}
