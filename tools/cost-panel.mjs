/**
 * cost-panel.mjs - build the canonical per-run cost panel for every model in the study.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every headline number in this project was, until now, computed by a different tool with
 * its own price table, its own dataset list and its own exclusion rule. FINDINGS F20 could
 * only be checked against four datasets; three of the seven collected matrices were never
 * in any re-derivation. This tool is the single place where a run becomes a cost.
 *
 * RULES, each one traceable to a document:
 *  1. PRICE.  One card per model, from tools/measure-gateway.mjs PRICES. Cost is re-derived
 *     from the archived token counts, never read from the logged cost.billedUsd, because
 *     logs written before 2026-09-30 17:43Z (commit 747b324) were priced with the retracted
 *     card. Tokens were always right; only the arithmetic was wrong.
 *  2. COST FUNCTION. The pre-registered one (PRE-REGISTRATION.md 53-56):
 *       cost_billed = fresh*miss + created*write + hit*hit + output*out
 *       cost_cold   = (all input)*miss + output*out
 *  3. CELL. A cell is (task, arm, seed). Every non-excluded record for a cell is carried, and
 *     the analysis AVERAGES over them. It never selects one.
 *
 *     This matters because two matrices contain re-run cells: glm53 has 6 (all six were credit
 *     failures whose re-run succeeded) and haiku-full has 34 (a resume after the matrix stalled
 *     at 00:42Z; 24 of the 34 disagree with their earlier record on `solved`). The pre-
 *     registration forbids selective topping-up, and the two obvious rules are both selective:
 *     "keep the first record" discards a legitimate second observation, and "keep the last"
 *     silently replaces a failure with a success whenever the re-run was prompted BY the
 *     failure. Averaging is the only rule that does not depend on why the re-run happened, and
 *     it is what the pre-registration already says to do with repeated measurements of a cell.
 *  4. EXCLUSION. A run is excluded only when it is UNSOLVED **and** carries a provider error
 *     string (PRE-REGISTRATION.md rule 9). A solved run is never excluded for containing a
 *     word. This is the F24 correction; the older tools matched the bare word "quota".
 *
 * Usage: node tools/cost-panel.mjs [--json <out>]
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { parseSyntheticKey } from './attribute.mjs'

/**
 * Gateway logs are DISCOVERED, never listed by hand.
 *
 * The first version of this file carried a per-dataset gateway filename. That was wrong
 * for four of ten datasets on the day it was written - glm-terse and glm-harness are in
 * glm53-gateway.jsonl, not glm-gateway.jsonl, and the list would have gone stale again on
 * the next launcher change. A wrong filename here is silent: it shows up as "no usage",
 * which reads like a data gap rather than a bug.
 */
export function discoverGateways(dir = 'results') {
  return readdirSync(dir).filter((f) => /gateway.*\.jsonl$/.test(f) && !/selftest/.test(f)).map((f) => dir + '/' + f)
}

// ---- the study's models -------------------------------------------------------------------
// ratio = out / miss, the variable the methodological claim is about.
export const MODELS = {
  'deepseek-flash':    { label: 'DeepSeek V4.1 Flash', provider: 'DeepSeek', card: { miss: 0.15, hit: 0.003, write: 0.15, out: 0.60 } },
  'glm-5.3-flash':     { label: 'GLM-5.3-Flash',       provider: 'z.ai',     card: { miss: 0.15, hit: 0.03,  write: 0.15, out: 0.50 } },
  'glm-5.3':           { label: 'GLM-5.3',             provider: 'z.ai',     card: { miss: 1.40, hit: 0.26,  write: 1.40, out: 4.40 } },
  'qwen3.8-flash':     { label: 'Qwen3.8-Flash',       provider: 'Alibaba',  card: { miss: 0.15, hit: 0.016, write: 0.15, out: 0.47 } },
  'claude-haiku-4.5':  { label: 'Claude Haiku 4.5',    provider: 'Anthropic',card: { miss: 1.00, hit: 0.10,  write: 1.25, out: 5.00 } },
  'claude-sonnet-5.5': { label: 'Claude Sonnet 5.5',   provider: 'Anthropic',card: { miss: 2.00, hit: 0.20,  write: 2.50, out: 10.00 } },
  'gpt-6-luna':        { label: 'gpt-6-luna',          provider: 'OpenAI',   card: { miss: 0.10, hit: 0.01,  write: 0.125, out: 0.50 } },
}

// ---- the matrices -------------------------------------------------------------------------
export const DATASETS = [
  { id: 'ds-full',       model: 'deepseek-flash',    runs: 'results/ds-full/runs.jsonl',       gateways: ['results/gateway.jsonl'],           note: '31 tasks x 10 arms x 2 seeds' },
  { id: 'glm-flash',     model: 'glm-5.3-flash',     runs: 'results/glm-flash/runs.jsonl',     gateways: ['results/glm-gateway.jsonl'],       note: '31 x 10 x 2' },
  { id: 'glm-terse',     model: 'glm-5.3-flash',     runs: 'results/glm-terse/runs.jsonl',     gateways: ['results/glm-gateway.jsonl'],       note: 'the H2 ablation' },
  { id: 'glm-harness',   model: 'glm-5.3-flash',     runs: 'results/glm-harness/runs.jsonl',   gateways: ['results/glm-gateway.jsonl'],       note: 'cross-harness extension' },
  { id: 'glm53',         model: 'glm-5.3',           runs: 'results/glm53/runs.jsonl',         gateways: ['results/glm53-gateway.jsonl'],     note: '1 seed' },
  { id: 'qwen-full',     model: 'qwen3.8-flash',     runs: 'results/qwen-full/runs.jsonl',     gateways: ['results/qwen-gateway.jsonl'],      note: '31 x 10 x 2' },
  { id: 'haiku-full',    model: 'claude-haiku-4.5',  runs: 'results/haiku-full/runs.jsonl',    gateways: ['results/anthropic-gateway.jsonl'], note: '31 x 10 x 2' },
  { id: 'sonnet-full',   model: 'claude-sonnet-5.5', runs: 'results/sonnet-full/runs.jsonl',   gateways: ['results/anthropic-gateway.jsonl'], note: '31 x 10 x 2' },
  { id: 'luna-full',     model: 'gpt-6-luna',        runs: 'results/luna-full/runs.jsonl',     gateways: ['results/openai-gateway.jsonl'],    note: '31 x 10 x 2' },
  // f18-sonnet is deliberately NOT in the panel. It is a single hard task while every other
  // dataset is the 31-task batch-1 suite, and including it gave Sonnet a 32nd task that no other
  // model had: every Sonnet arm mean inflated +11-23%, and DeepSeek-vs-Sonnet sign concordance
  // moved 46.4% -> 50.0%, which is the "worse than a coin flip" punchline. tools/f18-replication.mjs
  // reads it directly, which is where it belongs.
]

// ---- the replication suite (tasks-b), DELIBERATELY NOT IN THE DEFAULT POPULATION ---------------
//
// This panel pools its datasets BY MODEL: A2's DeepSeek row is a mean over every dataset mapped to
// deepseek-flash. Adding tasks-b matrices under those same model ids would therefore merge a
// replication suite into the six-model panel and move every filed number, silently - the paper's
// tables, the artifact manifest's regenerated outputs, all of it. So the tasks-b datasets carry
// `suite: 'batchb'`, the default selection is `suite: 'batch1'`, and reaching the new suite requires
// an explicit `--datasets batchb`. tools/dataset-selection.test.mjs pins all of that.
//
// Paths follow collect.mjs: outDir = --name-prefix + HISTORICAL_DIR[provider], so a launch with
// `--plan batchb --name-prefix batchb-` lands exactly here. They do not exist until it runs; a
// selected dataset whose file is absent is marked `missing: true` in meta rather than passing as an
// empty matrix.
//
// No `gateways` field: filenames are DISCOVERED (see discoverGateways above), and a listed name goes
// stale silently. The older entries above still carry one from before that fix; new ones do not.
export const BATCHB_DATASETS = [
  { id: 'batchb-deepseek', suite: 'batchb', model: 'deepseek-flash',    runs: 'results/batchb-ds-full/runs.jsonl',     note: 'tasks-b 40 x 10 x 2' },
  { id: 'batchb-glm-flash', suite: 'batchb', model: 'glm-5.3-flash',    runs: 'results/batchb-glm-flash/runs.jsonl',   note: 'tasks-b 40 x 10 x 2' },
  { id: 'batchb-qwen',      suite: 'batchb', model: 'qwen3.8-flash',    runs: 'results/batchb-qwen-full/runs.jsonl',   note: 'tasks-b 40 x 10 x 2' },
  { id: 'batchb-luna',      suite: 'batchb', model: 'gpt-6-luna',       runs: 'results/batchb-luna-full/runs.jsonl',   note: 'tasks-b 40 x 10 x 2' },
  { id: 'batchb-haiku',     suite: 'batchb', model: 'claude-haiku-4.5', runs: 'results/batchb-haiku-full/runs.jsonl',  note: 'tasks-b 40 x 10 x 2' },
  { id: 'batchb-sonnet',    suite: 'batchb', model: 'claude-sonnet-5.5',runs: 'results/batchb-sonnet-full/runs.jsonl', note: 'tasks-b 40 x 10 x 2' },
]
for (const d of DATASETS) d.suite = 'batch1'
DATASETS.push(...BATCHB_DATASETS)

/** Suite -> dataset ids. A suite name is a valid `--datasets` token; so is a single dataset id. */
export const SUITES = {
  batch1: DATASETS.filter((d) => d.suite === 'batch1').map((d) => d.id),
  batchb: BATCHB_DATASETS.map((d) => d.id),
}

/** What every existing invocation analyses. Unchanged, and pinned by test. */
export const DEFAULT_DATASETS = SUITES.batch1.slice()

/**
 * Resolve `--datasets` tokens (suite names or dataset ids) to dataset ids, in registry order.
 * An unknown token THROWS: a typo must not read as an empty analysis.
 */
export function selectDatasets(tokens = []) {
  const list = (Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean)
  if (!list.length) return DEFAULT_DATASETS.slice()
  const out = []
  for (const t of list) {
    const suite = SUITES[t]
    if (suite) { for (const id of suite) if (!out.includes(id)) out.push(id); continue }
    if (!DATASETS.some((d) => d.id === t)) {
      throw new Error('unknown dataset or suite "' + t + '". Known datasets: ' +
        DATASETS.map((d) => d.id).join(', ') + '; suites: ' + Object.keys(SUITES).join(', '))
    }
    if (!out.includes(t)) out.push(t)
  }
  return out
}

/** Split a `--datasets` argument value into tokens. One parser, shared by all three tools. */
export function datasetsArg (value = '') {
  return selectDatasets(String(value).split(',').map((s) => s.trim()).filter(Boolean))
}

/**
 * `--datasets <suite|id,id,...>` -> the dataset ids to analyse. ONE parser for all three tools.
 * A flag with no value THROWS: silently falling back to the default panel would analyse the wrong
 * population and say nothing, which is the whole failure mode this layer exists to prevent.
 */
export function selectionFromArgv (argv = process.argv.slice(2)) {
  const i = argv.indexOf('--datasets')
  if (i < 0) return DEFAULT_DATASETS.slice()
  const v = argv[i + 1]
  if (!v || v.startsWith('--')) {
    throw new Error('--datasets needs a value: a suite (' + Object.keys(SUITES).join(', ') +
      ') or dataset ids (' + DATASETS.map((d) => d.id).join(', ') + ')')
  }
  return datasetsArg(v)
}

/** An intentional refusal reads as one: message, exit 2, like collect.mjs's own output guard. */
export function refuse (message) {
  console.error('REFUSING: ' + message)
  process.exit(2)
}

/** The recorded analysis files. A non-default selection may never be written to one of these. */
export function filedPaths () {
  return ['analysis/panel-analysis.json', 'analysis/hypotheses.json', 'analysis/cost-panel.json',
    'analysis/panel-analysis-6model-2026-10-03.json', 'analysis/hypotheses-6model-2026-10-03.json',
    'analysis/cost-panel-6model-2026-10-03.json']
}

/**
 * Refuse to write a non-default selection to a filed analysis path.
 *
 * `--json` with no value defaults to the witness file, so `node tools/panel-analysis.mjs
 * --datasets batchb --json` would overwrite analysis/panel-analysis.json - the only witness to the
 * seven-model results - with a tasks-b panel. That is the failure this refuses. New paths are always
 * allowed; that is what tasks-b/PLAN.md section 6 prescribes (*-batchb-<date>.json).
 */
export function refuseFiledWrite (path, selection, defaults = DEFAULT_DATASETS) {
  const norm = String(path ?? '').replace(/\\/g, '/')
  const nonDefault = selection.join(',') !== defaults.join(',')
  if (nonDefault && (!norm || filedPaths().includes(norm))) {
    throw new Error('refusing to write a non-default dataset selection to a filed analysis path: ' +
      (norm || '(empty)') + '. Pass an explicit new path, e.g. --json analysis/panel-analysis-batchb-<date>.json')
  }
}

// The exclusion rule lives in ONE place. It used to live here as a bare word match on
// "quota", which dropped 10 SOLVED runs whose fixture text discusses quota policy (F24) and
// which, just as damagingly, failed to exclude the 113 luna runs that died on HTTP_404.
import { classifyRun, exclusionVerdict } from './exclusions.mjs'

/**
 * Rule 9 applied to one record and its gateway usage.
 *
 * Exported because both defects this replaced were about WHICH records reach the verdict:
 * a record with no usage entry at all is clause (b) - "reached the provider zero times" - and
 * not an unclassifiable one, so it must be handed to the rule as zero requests rather than
 * skipped before it. A record that is carried must also be the one that claims the cell's
 * primary slot, which is why primary is assigned after this returns.
 */
export function recordVerdict(run, usageEntry) {
  return exclusionVerdict(run, usageEntry ? usageEntry.requests : [])
}

// ---- load ---------------------------------------------------------------------------------
import { afterCutoff } from './study-window.mjs'

function loadRuns(path) {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

/** Stream every gateway log once, keeping usage only for runIds the matrices actually contain. */
function usageIndex(paths, wanted, datasetOf) {
  const need = new Set(wanted)
  // Records at or after a CLOSED matrix's cut-off are counted here and never enter the analysis.
  // Silent exclusion would be indistinguishable from losing data (notes/defects/EVIDENCE-DRIFT-2026-10-04.md).
  const postCutoff = new Map()
  const acc = new Map()   // runId -> { fresh, created, hit, out, reqs, models:Set }
  let scanned = 0
  for (const p of paths) {
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue
      scanned++
      let o; try { o = JSON.parse(line) } catch { continue }
      const a = parseSyntheticKey(o.syntheticKey)
      const runId = a?.runId ?? o.runId
      if (!runId || !need.has(runId)) continue
      const ds = datasetOf?.get(runId)
      if (ds && afterCutoff(ds, o.ts)) { postCutoff.set(ds, (postCutoff.get(ds) ?? 0) + 1); continue }
      const u = o.usage ?? {}
      const hit = u.cacheHitTokens ?? 0
      const miss = u.cacheMissTokens ?? Math.max(0, (u.inputTokens ?? 0) - hit)
      const created = u.cacheCreationTokens ?? 0
      const out = u.outputTokens ?? 0
      // The provider did not report a split for these input tokens. They are BILLED but unpriceable;
      // carrying them is the only honest option (notes/defects/DEFECT-anthropic-external-costs.md).
      const unknownInput = (u.cacheHitTokens == null && u.cacheMissTokens == null) ? (u.inputTokens ?? 0) : 0
      // fresh = miss, NOT max(0, miss - created). The token buckets are DISJOINT: Anthropic
      // reports input/creation/read as three separate counts, and DeepSeek/GLM/OpenAI partition
      // prompt_tokens into hit and miss with creation billed at the miss rate (creation is 0
      // there). Subtracting creation from miss and billing creation again at the write rate
      // counts those tokens down twice and up once - ~$0.10 understated across the study.
      const fresh = miss
      const e = acc.get(runId) ?? { fresh: 0, created: 0, hit: 0, out: 0, reqs: 0, failed: 0, unknownInput: 0, models: new Set(), requests: [] }
      e.fresh += fresh; e.created += created; e.hit += hit; e.out += out; e.reqs++
      e.unknownInput += unknownInput
      e.requests.push({ status: o.status })
      if (Number(o.status) >= 400) e.failed++
      if (o.model) e.models.add(o.model)
      acc.set(runId, e)
    }
  }
  return { acc, scanned, postCutoff }
}

export function buildPanel({ verbose = false, datasets = DEFAULT_DATASETS } = {}) {
  const byId = new Map(DATASETS.map((d) => [d.id, d]))
  const chosen = datasets.map((id) => {
    const d = byId.get(id)
    if (!d) throw new Error('unknown dataset "' + id + '". Known: ' + DATASETS.map((x) => x.id).join(', '))
    return d
  })
  const runsByDataset = {}
  const allRunIds = []
  for (const d of chosen) {
    const rows = loadRuns(d.runs)
    runsByDataset[d.id] = rows
    for (const r of rows) if (r.runId) allRunIds.push(r.runId)
  }
  const datasetOf = new Map()
  for (const d of chosen) for (const r of (runsByDataset[d.id] ?? [])) if (r.runId) datasetOf.set(r.runId, d.id)
  const gwPaths = discoverGateways()
  const { acc: usage, scanned, postCutoff } = usageIndex(gwPaths, allRunIds, datasetOf)
  if (verbose) console.log('# gateway records scanned: ' + scanned.toLocaleString() + '; runIds with usage: ' + usage.size)

  const panel = []
  const meta = {}
  for (const d of chosen) {
    const card = MODELS[d.model].card
    const seen = new Set()
    let dup = 0, excluded = 0, noUsage = 0, zeroUsage = 0, statusExcluded = 0
    const cellCounts = new Map()
    for (const r of runsByDataset[d.id]) {
      const arm = r.arm
      if (!arm || !r.task) continue
      const cell = [r.task, arm, r.seed].join('|')
      cellCounts.set(cell, (cellCounts.get(cell) ?? 0) + 1)
      const u = usage.get(r.runId)
      // TWO signals, because either one alone has already failed in this repo.
      //   text   - the run's own output names a fault (rule 9's first half)
      //   status - EVERY request this run made came back 4xx/5xx (rule 9's second half,
      //            never implemented until 50 Sonnet runs whose every call was HTTP 400
      //            were read as model failures)
      // ONE decision, from ONE function. Three tools used to re-implement this inline with three
      // different behaviours for the zero-request case, none with the rule's solved-guard.
      const verdict = recordVerdict(r, u)
      if (verdict.excluded) { if (verdict.half === 'status') statusExcluded++; else excluded++; continue }
      // Admitted by rule 9 but carrying no tokens: counted, not carried. It must NOT take the
      // cell's primary slot on the way out, or the surviving record becomes a `dup` and the
      // primary-only view loses a cell that has a perfectly good observation.
      if (!u) { noUsage++; continue }
      // A run that consumed ZERO tokens measured nothing, whatever its exit code - this is
      // rule 9's first clause ("the measurement failed"). 117 such rows existed in the first
      // version of this panel: the gateway logged requests whose usage came back all-zero, so
      // each one added a $0.00000 observation to its arm and pulled that arm's mean DOWN,
      // making a broken arm look frugal. They are counted, not carried.
      if ((u.fresh + u.created + u.hit + u.out) === 0) { zeroUsage++; continue }
      const costBilled = (u.fresh / 1e6) * card.miss + (u.created / 1e6) * (card.write ?? card.miss) +
                         (u.hit / 1e6) * card.hit + (u.out / 1e6) * card.out
      const inputTok = u.fresh + u.created + u.hit
      // costBilled prices an unknown split at the MISS rate, which is the dearest reading. The
      // floor prices the same tokens as cache reads. Both ship; neither is called the cost.
      const unknownTok = u.unknownInput ?? 0
      const costBilledLow = costBilled - (unknownTok / 1e6) * card.miss + (unknownTok / 1e6) * card.hit
      const costCold = (inputTok / 1e6) * card.miss + (u.out / 1e6) * card.out
      // PRIMARY is assigned only once a record is actually CARRIED. It used to be assigned at the
      // top of the loop, before the exclusion and zero-usage checks, so a cell whose first record
      // was excluded marked its surviving record `dup` - and `summarise(panel, { primaryOnly: true })`
      // then dropped the cell from the view entirely.
      const isPrimary = !seen.has(cell)
      if (isPrimary) seen.add(cell); else dup++
      panel.push({
        dataset: d.id, model: d.model, provider: MODELS[d.model].provider,
        ratio: +(card.out / card.miss).toFixed(4),
        task: r.task, arm, seed: r.seed, cell, primary: isPrimary, terse: r.terse === true,
        // POSITION IS CARRIED BECAUSE THE PANEL IS THE ONLY PLACE THE TWO RECORDS MEET.
        // It is the arm's index in the randomised execution order within a (task, seed) block
        // (tools/run-experiment.mjs), and notes/defects/DEFECT-position-confound-2026-10-04.md measures that it
        // carries 1.75x-3.82x of cost and inflates every raw differential by roughly a factor of
        // two. Any position-standardised re-derivation has to reweight the SAME cost this panel
        // prices; re-joining the runs file to a different pricing path lets the two disagree, and
        // a disagreement of one percentage point would flip GLM, whose interval ends 0.04pp from 0.
        position: r.position ?? null,
        recordsInCell: 0, // filled in below, once every record for the cell has been seen
        solved: !!r.solved, passRate: r.passRate ?? null,
        requests: u.reqs, fresh: u.fresh, created: u.created, hit: u.hit, out: u.out,
        costBilled: +costBilled.toFixed(8), costBilledLow: +costBilledLow.toFixed(8), costSplitUnknown: (u.unknownInput ?? 0) > 0, costCold: +costCold.toFixed(8),
        hitRate: (u.hit + u.fresh + u.created) > 0 ? u.hit / (u.hit + u.fresh + u.created) : null,
        classifiedCause: verdict.cause,
        zeroUsage: (u.fresh + u.created + u.hit + u.out) === 0,
      })
    }
    // Second pass: a cell's record count is only known after the whole file is read.
    const contestedCells = new Set(panel.filter((p) => p.dataset === d.id).filter((p) => panel.filter((q) => q.cell === p.cell && q.dataset === d.id).length > 1).map((p) => p.cell))
    const contested = contestedCells.size
    for (const p of panel) if (p.dataset === d.id) p.recordsInCell = cellCounts.get(p.cell) ?? 1

    // Did the terseness manipulation actually reach this matrix's terse arms?
    // "terse" is recorded by the runner as !!promptSuffix, so it is authoritative for what the
    // harness was sent. ds-full USED to be a sham here: it was collected before the runner's arm
    // list carried promptSuffix (commit 9b03ad8, 2026-09-30 17:01:37Z), so its terse arms ran the
    // base prompt. It was RE-COLLECTED on 2026-10-02 (commit 1132da0) and all 124 of its terse-arm
    // records now carry terse:true, so the sham is historical.
    // THIS FLAG IS COMPUTED, NEVER ASSERTED. A hardcoded "ds-full is a placebo" is exactly what
    // turned a real -46.2% terseness effect into a 46.2% "noise floor" in panel-analysis A7.
    const terseRows = runsByDataset[d.id].filter((r) => /terse/.test(r.arm ?? ''))
    const terseReal = terseRows.length === 0 ? null : terseRows.every((r) => r.terse === true)
    // `suite` is a SELECTION key, not a fact about a matrix, and it must not leak into the recorded
    // meta: every shipped analysis output is regenerated and compared against the file it came from,
    // and a new key here breaks that property for every dataset at once.
    const { suite: _suite, ...metaBase } = d
    meta[d.id] = { ...metaBase, rows: runsByDataset[d.id].length, dup, excluded, statusExcluded, noUsage, zeroUsage, cells: seen.size, contested, terseRows: terseRows.length, terseReal }
    if (verbose) console.log('  ' + d.id.padEnd(14) + MODELS[d.model].label.padEnd(20) + 'rows=' + String(runsByDataset[d.id].length).padStart(4) +
      ' cells=' + String(seen.size).padStart(4) + ' re-runs=' + String(dup).padStart(3) + ' excluded=' + String(excluded).padStart(3) +
      ' no-gateway=' + String(noUsage).padStart(3) + ' zero-$=' + String(zeroUsage).padStart(3) +
      ' all-4xx=' + String(statusExcluded).padStart(3) + ' panel=' + String(panel.filter((p) => p.dataset === d.id).length).padStart(4) +
      (contested ? '  CONTESTED=' + contested + ' cell(s) with >1 analysed record' : '') +
      (terseReal === null ? '' : (terseReal ? '  terse arms: REAL' : '  terse arms: SHAM (terse:false)')))
  }
  // A selected dataset whose runs file is absent is REPORTED, not passed off as an empty matrix:
  // 'the collection has not run' and 'the matrix is empty' must not look the same.
  //
  // Returned beside `meta` rather than inside it, deliberately: three legacy glm shards have been
  // absent from disk since the shards were collapsed, and a new key on their meta entries would
  // change the regenerated analysis JSON, breaking the verified property that every recorded
  // output reproduces identically apart from its `generated` timestamp.
  const missing = chosen.filter((d) => !existsSync(d.runs)).map((d) => d.id)
  for (const [id, n] of postCutoff) if (meta[id]) meta[id].postCutoff = n
  return { panel, meta, missing }
}

export function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN }

/**
 * Paired per-task mean difference (armB - armA), one value per task.
 *
 * MOVED HERE from tools/panel-analysis.mjs, verbatim, when tools/replication-verdict.mjs needed the
 * same estimator. The pre-registered replication verdict is computed on the SAME primary contrast
 * that A2 files, so the two tools must not each carry their own copy of it - the study has already
 * paid once for two tools implementing one rule two ways (see tools/stats.mjs's header). Only tasks
 * carrying BOTH arms contribute, which is what "paired by task" means everywhere in this study.
 */
export function pairedDiffs(panel, model, armA, armB) {
  const byTask = new Map()
  for (const r of panel.filter((x) => x.model === model)) {
    if (r.arm !== armA && r.arm !== armB) continue
    const e = byTask.get(r.task) ?? { a: [], b: [] }
    ;(r.arm === armA ? e.a : e.b).push(r.costBilled)
    byTask.set(r.task, e)
  }
  const d = new Map()
  for (const [t, e] of byTask) if (e.a.length && e.b.length) d.set(t, mean(e.b) - mean(e.a))
  return d
}

/**
 * Per model x arm summary.
 *
 * `primaryOnly` defaults to FALSE: every non-excluded record counts, so a re-run cell
 * contributes both of its observations rather than whichever one a selection rule preferred.
 * Pass primaryOnly:true to see the first-record-only view and compare.
 */
export function summarise(panel, { primaryOnly = false, solvedOnly = false } = {}) {
  const out = {}
  for (const r of panel) {
    if (primaryOnly && !r.primary) continue
    if (solvedOnly && !r.solved) continue
    const k = r.model + '|' + r.arm
    const a = out[k] = out[k] ?? { model: r.model, arm: r.arm, provider: r.provider, ratio: r.ratio, n: 0, solved: 0, billed: [], cold: [], reqs: [], outTok: [], hitRate: [], passRate: [] }
    a.n++; if (r.solved) a.solved++
    a.billed.push(r.costBilled); a.cold.push(r.costCold); a.reqs.push(r.requests)
    a.outTok.push(r.out); a.hitRate.push(r.hitRate ?? 0)
    if (r.passRate != null) a.passRate.push(r.passRate)
  }
  return Object.values(out).map((a) => ({
    ...a,
    billed: mean(a.billed), cold: mean(a.cold), reqs: mean(a.reqs),
    outTok: mean(a.outTok), hitRate: mean(a.hitRate), passRate: mean(a.passRate),
    solveRate: a.solved / a.n,
  }))
}

// ---- CLI ----------------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('cost-panel.mjs')) {
  let SELECTION
  try { SELECTION = selectionFromArgv() } catch (e) { refuse(e.message) }
  if (SELECTION.join(',') !== DEFAULT_DATASETS.join(',')) console.log('datasets: ' + SELECTION.join(', ') + '  (NOT the default panel)')
  console.log('CANONICAL COST PANEL - pre-registered cost function, one corrected card per model\n')
  const { panel, meta, missing } = buildPanel({ verbose: true, datasets: SELECTION })
  if (missing.length) console.log('\nNOT YET COLLECTED (no runs.jsonl): ' + missing.join(', '))
  if (!panel.length) { console.error('\nnothing to analyse: no rows in ' + SELECTION.join(', ')); process.exit(2) }
  console.log('\n=== PER MODEL x ARM (primary cells, provider-error runs excluded) ===')
  for (const model of Object.keys(MODELS)) {
    const rows = summarise(panel).filter((r) => r.model === model).sort((a, b) => a.billed - b.billed)
    if (!rows.length) continue
    const m = MODELS[model]
    console.log('\n' + m.label + '  (' + m.provider + ', output:input = ' + (m.card.out / m.card.miss).toFixed(2) + ')')
    console.log('  ' + 'arm'.padEnd(18) + 'n'.padStart(4) + 'solved'.padStart(9) + 'passRate'.padStart(10) + '$billed'.padStart(11) + '$cold'.padStart(11) + 'reqs'.padStart(7) + 'out/run'.padStart(9) + 'cache'.padStart(7))
    for (const r of rows) {
      console.log('  ' + r.arm.padEnd(18) + String(r.n).padStart(4) + (r.solved + '/' + r.n).padStart(9) +
        (Number.isFinite(r.passRate) ? (r.passRate * 100).toFixed(1) + '%' : '-').padStart(10) +
        ('$' + r.billed.toFixed(5)).padStart(11) + ('$' + r.cold.toFixed(5)).padStart(11) +
        r.reqs.toFixed(1).padStart(7) + Math.round(r.outTok).toLocaleString().padStart(9) + (r.hitRate * 100).toFixed(1).padStart(6) + '%')
    }
  }
  if (process.argv.includes('--json')) {
    const out = process.argv[process.argv.indexOf('--json') + 1] ?? 'analysis/cost-panel.json'
    try { refuseFiledWrite(out, SELECTION) } catch (e) { refuse(e.message) }
    mkdirSync(out.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
    writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), meta, panel }, null, 1))
    console.log('\nwrote ' + out + ' (' + panel.length + ' run rows)')
  }
}
