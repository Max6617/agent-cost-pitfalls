/**
 * anthropic-cost-bracket.mjs — what the Anthropic matrices cost, as a BRACKET.
 *
 * THE DEFECT (notes/defects/DEFECT-anthropic-external-costs.md). For the external-harness requests in the Anthropic
 * matrices the gateway log records no cache split: cacheHitTokens and cacheMissTokens are null while
 * inputTokens is large. Two tools then defaulted those tokens in OPPOSITE directions and each printed
 * its default as a number: costOf prices an unreported input token at zero (the lower bound) and
 * cost-panel prices it at the miss rate (the upper bound). On the batch-1 pair the two differ by
 * ~2.3x, and the upper bound as a point estimate - 266.87 - exceeds the whole session's Anthropic
 * ledger delta of 144.33, so it is refuted as a statement about money actually spent.
 *
 * WHAT THIS TOOL DOES. It prices every request of every Anthropic matrix three ways and carries the
 * counts beside them:
 *
 *   low            every unreported input token at the cache-READ rate (prices.costBounds)
 *   high           every unreported input token at the MISS rate        (prices.costBounds)
 *   pointDshShare  every unreported input token at the DSH arms' own observed cache-hit share for
 *                  that model - an imputation from the study's own data, not from the ledger
 *
 * and reconciles the batch-1 pair against the ledger. The reconciliation is the point of the tool:
 * the ledger gives one hard fact, the two batch-1 matrices together cost AT MOST 144.33 USD, so the
 * reported bracket is [low, min(high, ledger)] and the ledger-implied cache-read share of the
 * unreported input is (ledger - low) / (high - low). That share lands far below the DSH arms' own,
 * which is what the retention pilot independently found: on this provider the external harnesses do
 * not retain like the DSH arms (analysis/retention-pilot-2026-10-10.json).
 *
 * The tasks-b Anthropic matrices have the same defect and are reported beside the batch-1 pair, but
 * WITHOUT the ledger cap: they were collected in a later session, outside the 144.33 window.
 *
 * WHAT IT DOES NOT DO. It does not print an external-harness per-run figure. Every end of the
 * bracket is a default; the archive does not contain the split, so no tool can price it exactly.
 * A caller that quotes one end as a number is quoting a default, and the counts are here so the
 * bracket cannot collapse back into a point estimate.
 *
 * Usage: node tools/anthropic-cost-bracket.mjs [--json analysis/anthropic-cost-bracket-2026-10-10.json]
 *        [--ledger 144.33] [--table]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { costBounds, cacheSplitUnknown, cardFor } from './prices.mjs'
import { DATASETS, MODELS, discoverGateways } from './cost-panel.mjs'

/**
 * The ledger delta for the two batch-1 matrices plus the cache A/B pilot, from
 * notes/defects/DEFECT-anthropic-external-costs.md. It is used as the CAP for those two matrices, which is the
 * conservative reading: the A/B pilot's 45.38 could only make the matrices' own share smaller.
 */
export const LEDGER_USD = 144.33

/** The datasets the ledger delta covers. Deliberately by id, because the ledger is a fact about a window. */
export const LEDGER_DATASET_IDS = ['haiku-full', 'sonnet-full']

/** Every Anthropic matrix, batch 1 and tasks-b. DATASETS already holds both suites (cost-panel.mjs:107). */
export const ANTHROPIC_DATASETS = DATASETS.filter((d) => MODELS[d.model]?.provider === 'Anthropic')

/**
 * The cost ADDED to the low end when a share of the unreported input tokens is moved from the
 * cache-read rate to the miss rate:
 *
 *   share = 0  nothing moves            -> the low end
 *   share = 1  every token is a miss    -> the high end
 *
 * Linear in the share because the card is linear in the token counts. Exported so the normaliser
 * test can check both ends against costOf and the published card rather than trusting the algebra.
 * It returns the INCREMENT, not the tokens' total cost, because the low end already contains them
 * at the cache-read rate; adding their total cost would double-count the hit rate.
 */
export function incrementAt (card, unknownTokens, share) {
  if (!(share >= 0 && share <= 1)) throw new Error('cache-read share must be in [0,1]: ' + share)
  return (unknownTokens / 1e6) * share * (card.miss - card.hit)
}

/** Round for the record without pretending to more precision than the card has. */
const usd = (x) => +x.toFixed(4)
const share4 = (x) => (x == null ? null : +x.toFixed(4))

function runsOf (path) {
  const m = new Map()
  if (!existsSync(path)) return m
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const r = JSON.parse(line)
    if (r.runId) m.set(r.runId, r)
  }
  return m
}

/**
 * Analyse the Anthropic matrices. Reads runs files and gateway logs; writes nothing.
 */
export function analyse ({ datasets = ANTHROPIC_DATASETS, gateways = discoverGateways(), ledger = LEDGER_USD } = {}) {
  const entries = datasets.map((d) => ({
    id: d.id, suite: d.suite ?? null, model: d.model, label: MODELS[d.model]?.label ?? d.model,
    // The dataset's DECLARED runs path, not one rebuilt from the id: the tasks-b ids are
    // 'batchb-haiku'/'batchb-sonnet' while their directories are 'batchb-haiku-full'/'-sonnet-full'.
    runsPath: d.runs ?? ('results/' + d.id + '/runs.jsonl'),
    card: cardFor(d.model, { required: true }),
    requests: 0, unknownRequests: 0, unknownInputTokens: 0, knownRequests: 0, knownInputTokens: 0,
    low: 0, high: 0, dshHitTokens: 0, dshInputTokens: 0, cells: new Set(),
  }))

  for (const e of entries) {
    const runs = runsOf(e.runsPath)
    for (const r of runs.values()) e.cells.add(r.task + '|' + r.arm + '|' + r.seed)
    for (const f of gateways) {
      let text
      try { text = readFileSync(f, 'utf8') } catch { continue }
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        let o
        try { o = JSON.parse(line) } catch { continue }
        if (!o.usage || !o.runId) continue
        const run = runs.get(o.runId)
        if (!run) continue
        const b = costBounds(e.model, o.usage)
        e.requests++
        e.low += b.low
        e.high += b.high
        if (cacheSplitUnknown(o.usage)) {
          e.unknownRequests++
          e.unknownInputTokens += o.usage.inputTokens ?? 0
        } else {
          e.knownRequests++
          const known = (o.usage.cacheMissTokens ?? 0) + (o.usage.cacheCreationTokens ?? 0) + (o.usage.cacheHitTokens ?? 0)
          e.knownInputTokens += known
          // The DSH arms are the only arms whose split is recorded on this provider, so their
          // observed share is the one imputation this study can make from its own data.
          if (String(run.arm ?? '').startsWith('dsh')) {
            e.dshHitTokens += o.usage.cacheHitTokens ?? 0
            e.dshInputTokens += known
          }
        }
      }
    }
  }

  // The imputation is a property of the MODEL on this provider, so it pools both suites.
  const dshShareByModel = new Map()
  for (const e of entries) {
    const cur = dshShareByModel.get(e.model) ?? { hit: 0, denom: 0 }
    cur.hit += e.dshHitTokens; cur.denom += e.dshInputTokens
    dshShareByModel.set(e.model, cur)
  }
  for (const [m, v] of dshShareByModel) dshShareByModel.set(m, v.denom > 0 ? v.hit / v.denom : null)

  const rows = entries.map((e) => {
    const f = dshShareByModel.get(e.model)
    const point = f == null ? null : e.low + incrementAt(e.card, e.unknownInputTokens, f)
    return {
      dataset: e.id, suite: e.suite, model: e.model, label: e.label, cells: e.cells.size,
      requests: e.requests, unknownRequests: e.unknownRequests, unknownInputTokens: e.unknownInputTokens,
      knownRequests: e.knownRequests, knownInputTokens: e.knownInputTokens,
      lowUsd: usd(e.low), pointDshShareUsd: point == null ? null : usd(point), highUsd: usd(e.high),
      midpointUsd: usd((e.low + e.high) / 2),
      dshHitShare: share4(f),
      perRunLowUsd: e.cells.size ? usd(e.low / e.cells.size) : null,
      perRunPointUsd: point == null || !e.cells.size ? null : usd(point / e.cells.size),
      perRunHighUsd: e.cells.size ? usd(e.high / e.cells.size) : null,
    }
  })

  const subtotal = (ids) => {
    const rs = rows.filter((r) => ids.includes(r.dataset))
    const low = rs.reduce((a, r) => a + r.lowUsd, 0)
    const high = rs.reduce((a, r) => a + r.highUsd, 0)
    const point = rs.some((r) => r.pointDshShareUsd == null) ? null : rs.reduce((a, r) => a + r.pointDshShareUsd, 0)
    const cells = rs.reduce((a, r) => a + r.cells, 0)
    return {
      datasets: ids, cells,
      requests: rs.reduce((a, r) => a + r.requests, 0),
      unknownRequests: rs.reduce((a, r) => a + r.unknownRequests, 0),
      unknownInputTokens: rs.reduce((a, r) => a + r.unknownInputTokens, 0),
      lowUsd: usd(low), pointDshShareUsd: point == null ? null : usd(point), highUsd: usd(high),
      midpointUsd: usd((low + high) / 2),
      perRunLowUsd: cells ? usd(low / cells) : null,
      perRunPointUsd: point == null || !cells ? null : usd(point / cells),
      perRunHighUsd: cells ? usd(high / cells) : null,
    }
  }

  const batch1 = subtotal(LEDGER_DATASET_IDS)
  // The ledger is a cap on the pair. If it lands below the cache-read floor the two records
  // contradict each other, and that is reported rather than smoothed.
  const capApplies = ledger > batch1.lowUsd && ledger < batch1.highUsd
  const impliedShare = batch1.highUsd > batch1.lowUsd ? (ledger - batch1.lowUsd) / (batch1.highUsd - batch1.lowUsd) : null
  let dshHit = 0, dshDenom = 0
  for (const e of entries) { dshHit += e.dshHitTokens; dshDenom += e.dshInputTokens }
  const dshSharePooled = dshDenom > 0 ? dshHit / dshDenom : null
  const reconciled = {
    ...batch1,
    ledgerUsd: ledger,
    capApplies,
    reconciledHighUsd: usd(Math.min(batch1.highUsd, ledger)),
    // The reconciled central reading: the midpoint of [cache-read floor, ledger cap]. It is a reading
    // of the money, not of the cache, and it is reported BESIDE the DSH-share imputation - which the
    // ledger refutes - rather than instead of it.
    pointReconciledUsd: usd((batch1.lowUsd + Math.min(batch1.highUsd, ledger)) / 2),
    perRunPointReconciledUsd: batch1.cells ? usd((batch1.lowUsd + Math.min(batch1.highUsd, ledger)) / 2 / batch1.cells) : null,
    perRunReconciledHighUsd: batch1.cells ? usd(Math.min(batch1.highUsd, ledger) / batch1.cells) : null,
    impliedPerRunUsd: batch1.cells ? usd(ledger / batch1.cells) : null,
    impliedCacheReadShare: share4(impliedShare),
  }

  const otherIds = rows.map((r) => r.dataset).filter((id) => !LEDGER_DATASET_IDS.includes(id))
  const other = otherIds.length ? subtotal(otherIds) : null

  return {
    defect: 'DEFECT-anthropic-external-costs.md',
    method: 'per-request prices.costBounds; low = unreported input at the cache-read rate, high = at the ' +
      'miss rate, pointDshShare = unreported input at the DSH arms token-weighted observed cache-hit ' +
      'share for the same model, pooled over that model suites. Matrix scope: only requests whose ' +
      'runId is a record in the dataset runs.jsonl - the population the panel prices.',
    ledger: {
      usd: ledger,
      source: 'DEFECT-anthropic-external-costs.md: the session ledger delta for the two batch-1 matrices plus the cache A/B pilot, used here as the conservative cap for those two matrices',
      coversDatasets: LEDGER_DATASET_IDS,
    },
    models: rows,
    batch1: reconciled,
    otherSuites: other,
    dshHitSharePooled: share4(dshSharePooled),
    reading: batch1.pointDshShareUsd == null ? null
      : (batch1.pointDshShareUsd > ledger
          ? 'Both the DSH-share imputation (' + batch1.pointDshShareUsd + ') and the all-miss bound (' +
            batch1.highUsd + ') exceed the ledger cap (' + ledger + '), so the unreported input was cached far ' +
            'less than the DSH arms cache. The ledger-implied cache-read share is ' + share4(impliedShare) +
            ' against the DSH arms pooled share ' + share4(dshSharePooled) + '. Report the bracket; the ' +
            'point is itself refuted.'
          : 'The DSH-share imputation sits inside the ledger cap; report the bracket and the point.'),
    note: 'No external-harness per-run Anthropic figure may be quoted from this: every end is a default, ' +
      'because the archive does not record the split for these requests.',
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('anthropic-cost-bracket.mjs')
if (isMain) {
  const argv = process.argv.slice(2)
  const opt = (name, dflt = null) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt }
  const ledger = Number(opt('--ledger', LEDGER_USD))
  const r = analyse({ ledger })
  const jp = opt('--json')
  if (jp) {
    const out = { generated: new Date().toISOString(), ...r }
    mkdirSync(dirname(jp), { recursive: true })
    writeFileSync(jp, JSON.stringify(out, null, 1) + String.fromCharCode(10))
    console.log('wrote ' + jp)
  }
  if (argv.includes('--table') || !jp) {
    console.log('dataset           model                reqs  unknown   unknown in      low     point      high   per-run low-high')
    for (const m of r.models) {
      console.log('  ' + m.dataset.padEnd(15) + m.label.padEnd(20) + String(m.requests).padStart(6) +
        String(m.unknownRequests).padStart(9) + ((m.unknownInputTokens / 1e6).toFixed(1) + 'M').padStart(12) +
        m.lowUsd.toFixed(2).padStart(9) + (m.pointDshShareUsd == null ? 'n/a' : m.pointDshShareUsd.toFixed(2)).padStart(9) +
        m.highUsd.toFixed(2).padStart(9) + ('   ' + m.perRunLowUsd.toFixed(4) + '-' + m.perRunHighUsd.toFixed(4)).padStart(20))
    }
    const b = r.batch1
    console.log('  BATCH-1 PAIR'.padEnd(36) + String(b.requests).padStart(6) + String(b.unknownRequests).padStart(9) +
      ((b.unknownInputTokens / 1e6).toFixed(1) + 'M').padStart(12) + b.lowUsd.toFixed(2).padStart(9) +
      (b.pointDshShareUsd == null ? 'n/a' : b.pointDshShareUsd.toFixed(2)).padStart(9) + b.highUsd.toFixed(2).padStart(9) +
      ('   ' + b.perRunLowUsd.toFixed(4) + '-' + b.perRunHighUsd.toFixed(4)).padStart(20))
    console.log('  ledger cap ' + r.ledger.usd + ' -> reconciled bracket [' + b.lowUsd + ', ' + b.reconciledHighUsd +
      '] USD; implied per-run ' + b.impliedPerRunUsd + '; ledger-implied cache-read share ' + b.impliedCacheReadShare)
    if (r.otherSuites) console.log('  other suites (no ledger cap): [' + r.otherSuites.lowUsd + ', ' + r.otherSuites.highUsd +
      '] USD over ' + r.otherSuites.cells + ' cells, ' + r.otherSuites.unknownRequests + ' unknown requests')
    console.log('  ' + r.reading)
  }
}
