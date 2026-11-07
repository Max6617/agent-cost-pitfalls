/**
 * panel-analysis.mjs - the study's cross-provider statistics, from ONE cost panel.
 *
 * Every number here comes from tools/cost-panel.mjs, which re-prices every run from archived
 * token counts under the pre-registered cost function and one corrected card per model.
 * Nothing here reads a logged cost.
 *
 * The question this answers changed after F20. The original thesis - "the harness ranking
 * inverts because the price ratio differs" - is dead: H1 was contradicted in direction and
 * the ratio does not order the seven models we now have. What replaced it is testable and
 * was never tested, because until now the seven matrices had never been put in one table.
 *
 *  A1  Is the harness ranking the same on every provider?
 *  A2  How large is the PTC-vs-native differential, per model, with an interval?
 *  A3  Does the provider's output:input price ratio predict that differential?
 *  A4  Does the terseness instruction travel across providers?
 *  A5  How do cost-per-run and cost-per-solved-task disagree?
 *  A6  What does each provider's cache regime look like, and who decides it?
 *
 * Usage: node tools/panel-analysis.mjs [--json analysis/panel-analysis.json]
 */
// pairedDiffs lives in cost-panel.mjs, not here: tools/replication-verdict.mjs applies the
// pre-registered R1/R2 rule to the SAME primary contrast A2 files, and the study has already paid
// once for two tools carrying two copies of one estimator (see tools/stats.mjs). PASS prim to it.
import { buildPanel, summarise, mean, pairedDiffs, MODELS, DATASETS, selectionFromArgv, refuseFiledWrite, refuse, DEFAULT_DATASETS } from './cost-panel.mjs'
import { cacheRegimeSplit } from './cache-regime.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { shuffleWith } from './rng.mjs'
import { bootstrapTaskMean, signFlipP, holmFamily, permutationP } from './stats.mjs'

let SELECTION
try { SELECTION = selectionFromArgv() } catch (e) { refuse(e.message) }
if (SELECTION.join(',') !== DEFAULT_DATASETS.join(',')) console.log('datasets: ' + SELECTION.join(', ') + '  (NOT the default six-model panel)')
const { panel, meta, missing } = buildPanel({ datasets: SELECTION })
if (missing.length) console.log('NOT YET COLLECTED (no runs.jsonl): ' + missing.join(', '))
if (!panel.length) { console.error('nothing to analyse: no panel rows in ' + SELECTION.join(', ')); process.exit(2) }
// Every non-excluded record, not one per cell. Two matrices contain re-run cells (glm53: 6,
// haiku-full: 34); the analysis averages over a cell's records rather than picking one, so no
// selection rule has to be defended. See the CELL note in tools/cost-panel.mjs.
const prim = panel
const out = { generated: new Date().toISOString(), meta, sections: {} }
let A1bStats = {}
// Section objects are created up-front: the analysis blocks below fill them in, and some
// blocks run before the block that would otherwise define the object.
for (const k of ['A1', 'A1b', 'A1c', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']) out.sections[k] = out.sections[k] ?? {}

const armsOf = (model) => [...new Set(prim.filter((r) => r.model === model).map((r) => r.arm))].sort()
const MODELS_IN_ORDER = Object.keys(MODELS)
const DSH_ARMS = ['dsh:native', 'dsh:native-opt', 'dsh:native-terse', 'dsh:ptc', 'dsh:ptc-opt', 'dsh:ptc-terse']
const HARNESS_ARMS = ['opencode', 'goose', 'cline', 'openhands']

/** Per-model arm table. */
function armTable(model, arms = null) {
  const rows = summarise(prim).filter((r) => r.model === model && (!arms || arms.includes(r.arm)))
  return rows.sort((a, b) => a.billed - b.billed)
}

// ---- A1: is the ranking provider-stable? --------------------------------------------------
console.log('\n########## A1  Is the harness ranking the same on every provider? ##########')
const rankTables = {}
for (const m of MODELS_IN_ORDER) {
  const t = armTable(m)
  if (!t.length) continue
  rankTables[m] = t.map((r, i) => ({ rank: i + 1, arm: r.arm, billed: r.billed, solveRate: r.solveRate }))
  console.log('\n' + MODELS[m].label + ' (ratio ' + (MODELS[m].card.out / MODELS[m].card.miss).toFixed(2) + ', ' + t.length + ' arms)')
  console.log('  ' + t.map((r, i) => (i + 1) + '.' + r.arm + ' $' + r.billed.toFixed(5)).join('   '))
}

// The 8 arms that are valid AND present on all seven models. The four terse arms are
// excluded because ds-full's are a SHAM (A7) - including them would put two identical
// treatments at opposite ends of DeepSeek's ranking and manufacture disagreement.
const CLEAN_ARMS = ['dsh:native', 'dsh:native-opt', 'dsh:ptc', 'dsh:ptc-opt', 'opencode', 'goose', 'cline', 'openhands']
console.log('\n--- A1b  the same test on the ' + CLEAN_ARMS.length + ' arms that are valid on every model (terse arms excluded) ---')
const cleanTables = {}
for (const m of MODELS_IN_ORDER) {
  const t = armTable(m, CLEAN_ARMS)
  if (t.length !== CLEAN_ARMS.length) { console.log('  skipping ' + MODELS[m].label + ' (only ' + t.length + ' clean arms)'); continue }
  cleanTables[m] = t
}
const cleanCorr = []
const cleanKeys = Object.keys(cleanTables)
for (let i = 0; i < cleanKeys.length; i++) {
  for (let j = i + 1; j < cleanKeys.length; j++) {
    const s = spearman(cleanTables[cleanKeys[i]], cleanTables[cleanKeys[j]])
    if (s) cleanCorr.push({ a: cleanKeys[i], b: cleanKeys[j], ...s })
  }
}
cleanCorr.sort((x, y) => x.rho - y.rho)
for (const c of cleanCorr) console.log('  ' + MODELS[c.a].label.padEnd(20) + MODELS[c.b].label.padEnd(20) + 'rho = ' + c.rho.toFixed(3).padStart(6))
{
  const rs = cleanCorr.map((c) => c.rho)
  const sorted = [...rs].sort((x, y) => x - y)
  // A selection with ONE model has no model pairs, and this repo's rule is to say so rather than to
  // crash or print NaN - the tasks-b analysis legitimately selects one dataset per provider.
  let med = null, pval = null
  if (!rs.length) {
    console.log('  one model in this selection: cross-model rank agreement (A1b) is not computable')
  } else {
  med = sorted[Math.floor(sorted.length / 2)]
  console.log('  median rho across ' + rs.length + ' model pairs = ' + med.toFixed(3) + '   range ' + sorted[0].toFixed(3) + ' .. ' + sorted[sorted.length - 1].toFixed(3))
  // Null: if a provider left no fingerprint on the ranking, each model's ordering of the
  // 8 arms is an independent random permutation. Simulate that and ask how often the
  // MEDIAN pairwise rho is at least as large as the one we observed.
  // tools/stats.mjs owns the simulation; no stream is held in this file.
  const n = CLEAN_ARMS.length
  const rhoOf = (pa, pb) => {
    const d2 = pa.reduce((s, arm) => s + (pa.indexOf(arm) - pb.indexOf(arm)) ** 2, 0)
    return 1 - (6 * d2) / (n * (n * n - 1))
  }
  const medOf = (permList) => {
    const cs = []
    for (let i = 0; i < permList.length; i++) for (let j = i + 1; j < permList.length; j++) cs.push(rhoOf(permList[i], permList[j]))
    cs.sort((x, y) => x - y)
    return cs[Math.floor(cs.length / 2)]
  }
  const ITERS = 20000
  const np = permutationP({
    observed: med,
    replicate: (rnd) => medOf(Array.from({ length: cleanKeys.length }, () => shuffleWith(CLEAN_ARMS, rnd))),
    iters: ITERS,
    seed: 0x51ed270b,
  })
  pval = np.p
  console.log('  permutation p (median rho under independent random arm orders) = ' + pval.toFixed(4) + ' +/- ' + (2 * np.se).toFixed(4) + '   [' + ITERS.toLocaleString() + ' draws]')
  }
  console.log('  cheapest clean arm per model: ' + cleanKeys.map((m) => MODELS[m].label + '=' + cleanTables[m][0].arm).join('  '))
  const cheap = cleanKeys.map((m) => cleanTables[m][0].arm)
  console.log('  distinct cheapest arms: ' + [...new Set(cheap)].length + ' of ' + cleanKeys.length + ' models -> ' + [...new Set(cheap)].join(', '))

  // A1c: sign concordance. Every pair of arms defines a comparison; does the winner
  // stay the winner on another provider? This is the number a benchmark consumer cares
  // about, and it needs no rank statistics to interpret.
  let agree = 0, total = 0
  const perPair = []
  for (let i = 0; i < cleanKeys.length; i++) {
    for (let j = i + 1; j < cleanKeys.length; j++) {
      const A = cleanTables[cleanKeys[i]], B = cleanTables[cleanKeys[j]]
      let a2 = 0, t2 = 0
      for (let x = 0; x < CLEAN_ARMS.length; x++) {
        for (let y = x + 1; y < CLEAN_ARMS.length; y++) {
          const ax = A.find((r) => r.arm === CLEAN_ARMS[x]).billed, ay = A.find((r) => r.arm === CLEAN_ARMS[y]).billed
          const bx = B.find((r) => r.arm === CLEAN_ARMS[x]).billed, by = B.find((r) => r.arm === CLEAN_ARMS[y]).billed
          t2++; if (Math.sign(ax - ay) === Math.sign(bx - by)) a2++
        }
      }
      agree += a2; total += t2
      perPair.push({ a: cleanKeys[i], b: cleanKeys[j], concordance: a2 / t2 })
    }
  }
  perPair.sort((x, y) => x.concordance - y.concordance)
  console.log('')
  console.log('  A1c  Of all 28 arm-vs-arm cost comparisons, the fraction that keep the same winner')
  console.log('       on a second provider: overall ' + (total ? (agree / total * 100).toFixed(1) + '%' : 'n/a (one model selected)') + '  (chance = 50%)')
  if (perPair.length) {
  console.log('       worst provider pair: ' + MODELS[perPair[0].a].label + ' vs ' + MODELS[perPair[0].b].label + ' -> ' + (perPair[0].concordance * 100).toFixed(1) + '%')
  console.log('       best  provider pair: ' + MODELS[perPair[perPair.length - 1].a].label + ' vs ' + MODELS[perPair[perPair.length - 1].b].label + ' -> ' + (perPair[perPair.length - 1].concordance * 100).toFixed(1) + '%')
  } else console.log('       (one model in this selection: no provider pairs)')
  // A1d: robustness. A referee will ask whether the disagreement is produced by one
  // odd arm group, or by the two models whose solve rates are not at ceiling.
  const concordance = (arms, models) => {
    let a3 = 0, t3 = 0
    for (let i = 0; i < models.length; i++) for (let j = i + 1; j < models.length; j++) {
      const A = cleanTables[models[i]], B = cleanTables[models[j]]
      for (let x = 0; x < arms.length; x++) for (let y = x + 1; y < arms.length; y++) {
        const ax = A.find((r) => r.arm === arms[x]).billed, ay = A.find((r) => r.arm === arms[y]).billed
        const bx = B.find((r) => r.arm === arms[x]).billed, by = B.find((r) => r.arm === arms[y]).billed
        t3++; if (Math.sign(ax - ay) === Math.sign(bx - by)) a3++
      }
    }
    return { concordance: t3 ? a3 / t3 : null, comparisons: t3 }
  }
  const dshOnly = CLEAN_ARMS.filter((a) => a.startsWith('dsh:'))
  const extOnly = CLEAN_ARMS.filter((a) => !a.startsWith('dsh:'))
  const noAnthropic = cleanKeys.filter((m) => MODELS[m].provider !== 'Anthropic')
  // "At ceiling" = the model's WORST arm still solves >=90% of runs, so a cost comparison
  // between its arms is not confounded by one arm failing tasks the others solve.
  const ceilingOnly = cleanKeys.filter((m) => { const t = cleanTables[m]; return Math.min(...t.map((r) => r.solveRate)) >= 0.90 })
  console.log('')
  console.log('  solve-rate range per model (all clean arms): ' + cleanKeys.map((m) => MODELS[m].label + ' ' + (Math.min(...cleanTables[m].map((r) => r.solveRate)) * 100).toFixed(0) + '-' + (Math.max(...cleanTables[m].map((r) => r.solveRate)) * 100).toFixed(0) + '%').join('  |  '))
  console.log('')
  console.log('  A1d  robustness of the concordance:')
  for (const [label, arms, models] of [
    ['within DSH arms only        ', dshOnly, cleanKeys],
    ['within external harnesses   ', extOnly, cleanKeys],
    ['excluding Anthropic models  ', CLEAN_ARMS, noAnthropic],
    ['models at ceiling on solve  ', CLEAN_ARMS, ceilingOnly],
  ]) {
    const c = concordance(arms, models)
    console.log('       ' + label + ' ' + (c.concordance * 100).toFixed(1) + '%   (' + arms.length + ' arms x ' + models.length + ' models, ' + c.comparisons + ' comparisons)')
  }
  out.sections.A1d = {
    dshOnly: concordance(dshOnly, cleanKeys), externalOnly: concordance(extOnly, cleanKeys),
    noAnthropic: concordance(CLEAN_ARMS, noAnthropic), ceilingModels: concordance(CLEAN_ARMS, ceilingOnly),
    ceilingModelList: ceilingOnly,
  }
  out.sections.A1c = { overallConcordance: total ? agree / total : null, perPair }
  // Assigned AFTER the object literal below, which would otherwise overwrite them.
  A1bStats = { medianRho: med, permutationP: pval, rankVarianceExplained: med == null ? null : med * med }
}
out.sections.A1b = { correlations: cleanCorr, cleanArms: CLEAN_ARMS, cheapest: cleanKeys.map((m) => ({ model: m, arm: cleanTables[m][0].arm, billed: cleanTables[m][0].billed })), ...A1bStats }

/** Spearman rank correlation between two models over their shared arms. */
function spearman(a, b) {
  const shared = a.filter((x) => b.some((y) => y.arm === x.arm)).map((x) => x.arm)
  if (shared.length < 3) return null
  const ra = shared.map((arm) => a.findIndex((x) => x.arm === arm))
  const rb = shared.map((arm) => b.findIndex((x) => x.arm === arm))
  const n = shared.length
  const d2 = ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0)
  return { rho: 1 - (6 * d2) / (n * (n * n - 1)), n }
}
console.log('\n  Spearman rank correlation of per-arm cost, model pairs (shared arms only):')
const corr = []
for (let i = 0; i < MODELS_IN_ORDER.length; i++) {
  for (let j = i + 1; j < MODELS_IN_ORDER.length; j++) {
    const a = armTable(MODELS_IN_ORDER[i]); const b = armTable(MODELS_IN_ORDER[j])
    if (!a.length || !b.length) continue
    const s = spearman(a, b); if (!s) continue
    corr.push({ a: MODELS_IN_ORDER[i], b: MODELS_IN_ORDER[j], ...s })
  }
}
corr.sort((x, y) => x.rho - y.rho)
console.log('  ' + 'model A'.padEnd(20) + 'model B'.padEnd(20) + 'arms'.padStart(5) + 'spearman'.padStart(10))
for (const c of corr) console.log('  ' + MODELS[c.a].label.padEnd(20) + MODELS[c.b].label.padEnd(20) + String(c.n).padStart(5) + c.rho.toFixed(3).padStart(10))
console.log(corr.length
  ? '  median rho = ' + corr.map((c) => c.rho).sort((x, y) => x - y)[Math.floor(corr.length / 2)].toFixed(3) + '   min = ' + corr[0].rho.toFixed(3) + '   max = ' + corr[corr.length - 1].rho.toFixed(3)
  : '  one model in this selection: no model pairs to correlate')
out.sections.A1 = { rankTables, correlations: corr }

// ---- A2/A3: PTC vs native, and whether the ratio predicts it -------------------------------
// The cluster bootstrap lives in tools/stats.mjs (bootstrapTaskMean for the paired-difference
// case), so this file and tools/hypotheses.mjs cannot drift apart again.

console.log('\n########## A2  PTC vs native differential, per model, paired by task ##########')
console.log('  ' + 'model'.padEnd(20) + 'ratio'.padStart(6) + 'tasks'.padStart(6) + 'native $'.padStart(11) + 'ptc $'.padStart(11) + 'diff'.padStart(9) + '95% CI (cluster bootstrap)'.padStart(30))
const ptcRows = []
for (const m of MODELS_IN_ORDER) {
  const nat = summarise(prim).find((r) => r.model === m && r.arm === 'dsh:native')
  const ptc = summarise(prim).find((r) => r.model === m && r.arm === 'dsh:ptc')
  if (!nat || !ptc) continue
  const d = pairedDiffs(prim, m, 'dsh:native', 'dsh:ptc')
  const ci = bootstrapTaskMean(d)
  const md = mean([...d.values()])
  const rel = md / nat.billed * 100
  const row = { model: m, label: MODELS[m].label, ratio: MODELS[m].card.out / MODELS[m].card.miss, tasks: d.size, native: nat.billed, ptc: ptc.billed, absDiff: md, relDiffPct: rel, ciLo: ci.lo, ciHi: ci.hi, ciLoPct: ci.lo / nat.billed * 100, ciHiPct: ci.hi / nat.billed * 100, excludesZero: ci.lo > 0 || ci.hi < 0 }
  ptcRows.push(row)
  console.log('  ' + MODELS[m].label.padEnd(20) + row.ratio.toFixed(2).padStart(6) + String(d.size).padStart(6) +
    ('$' + nat.billed.toFixed(5)).padStart(11) + ('$' + ptc.billed.toFixed(5)).padStart(11) +
    ((rel >= 0 ? '+' : '') + rel.toFixed(1) + '%').padStart(9) +
    ('[' + row.ciLoPct.toFixed(1) + '%, ' + row.ciHiPct.toFixed(1) + '%]').padStart(30) + (row.excludesZero ? '  *' : '  n.s.'))
}
// ---- A2b: the same contrasts, tested. The family correction is printed ONCE, after A4 --------
// PRE-REGISTRATION.md section 6: "All secondary and pairwise contrasts receive Holm-Bonferroni
// correction across the family reported together." The rule was filed and implemented nowhere, so
// the stars in A2 were uncorrected; then it was implemented over a family of seven while the A4
// McNemar tests - also secondary/pairwise contrasts, reported in the same document - sat outside
// it. A family is not a block: it is every contrast reported together, so the corrected verdict is
// printed once below and no table can be read without it.
console.log('')
console.log('  A2b  the same contrasts, tested (sign-flip permutation, a fresh stream per contrast)')
{
  const fam = ptcRows.map((r) => {
    const d = pairedDiffs(prim, r.model, 'dsh:native', 'dsh:ptc')
    const { p, se, iters } = signFlipP([...d.values()])
    return { id: 'cost:' + r.model, label: r.label, model: r.model, block: 'A2b',
             contrast: 'dsh:native -> dsh:ptc', ratio: r.ratio, rel: r.relDiffPct, tasks: d.size, p, se, iters }
  })
  console.log('  ' + 'model'.padEnd(20) + 'ratio'.padStart(6) + 'diff'.padStart(9) + 'perm p'.padStart(10) + '+/-2se'.padStart(9) + 'draws'.padStart(9))
  for (const r of fam) {
    console.log('  ' + r.label.padEnd(20) + r.ratio.toFixed(2).padStart(6) +
      ((r.rel >= 0 ? '+' : '') + r.rel.toFixed(1) + '%').padStart(9) +
      r.p.toFixed(4).padStart(10) + ('+/-' + (2 * r.se).toFixed(4)).padStart(9) + String(r.iters).padStart(9))
  }
  out.sections.A2b = fam
}

out.sections.A2 = ptcRows

console.log('\n########## A3  Does output:input ratio predict the PTC differential? ##########')
const xs = ptcRows.map((r) => r.ratio), ys = ptcRows.map((r) => r.relDiffPct)
const mx = mean(xs), my = mean(ys)
const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
const sx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0)), sy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0))
const pearson = cov / (sx * sy)
// Spearman on ratio vs differential
const rr = xs.map((x, i) => [x, ys[i]]).sort((a, b) => a[0] - b[0])
const rankY = new Map(rr.map((p, i) => [i, i]))
const d2 = rr.reduce((s, p, i) => s + (i - rankY.get(i)) ** 2, 0)
console.log('  Pearson r (ratio vs PTC differential)   = ' + pearson.toFixed(3) + '  (n=' + xs.length + ')')
console.log('  ratio range in the study                 = ' + Math.min(...xs).toFixed(2) + ' to ' + Math.max(...xs).toFixed(2))
const atFive = ptcRows.filter((r) => r.ratio === 5)
console.log('  the three models at ratio 5.00 give      = ' + atFive.map((r) => r.label + ' ' + (r.relDiffPct >= 0 ? '+' : '') + r.relDiffPct.toFixed(1) + '%').join('; '))
console.log('  -> spread WITHIN one ratio (' + (Math.max(...atFive.map((r) => r.relDiffPct)) - Math.min(...atFive.map((r) => r.relDiffPct))).toFixed(1) + ' points) exceeds the whole across-ratio range (' + (Math.max(...ys) - Math.min(...ys)).toFixed(1) + ' points).')
out.sections.A3 = { pearson, atFive: atFive.map((r) => ({ label: r.label, relDiffPct: r.relDiffPct })), ratioRange: [Math.min(...xs), Math.max(...xs)] }

// ---- A4: the terseness instruction across providers -----------------------------------------
console.log('\n########## A4  Does the terseness instruction travel? (paired by task, default -> terse) ##########')
// A model is only usable for A4 if EVERY terse-arm record in EVERY dataset that feeds it carries
// terse:true - see meta[id].terseReal in tools/cost-panel.mjs, which is COMPUTED from the records.
// DeepSeek used to fail this gate: its terse arms were collected before the runner's arm list
// carried promptSuffix (commit 9b03ad8, 2026-09-30 17:01:37Z) and ran the base prompt. ds-full was
// RE-COLLECTED on 2026-10-02 (commit 1132da0) and all 124 terse-arm records now carry terse:true,
// so DeepSeek's terseness contrast is a real contrast again and belongs here, not in A7.
const terseUsable = new Set()
for (const [id, m] of Object.entries(meta)) {
  if (m.terseReal === true) terseUsable.add(m.model)
}
for (const [id, m] of Object.entries(meta)) {
  if (m.terseReal === false) terseUsable.delete(m.model)
}
console.log('  terseness manipulation verified real for: ' + [...terseUsable].map((m) => MODELS[m].label).join(', '))
console.log('  ' + 'model'.padEnd(20) + 'contrast'.padEnd(26) + 'tasks'.padStart(6) + 'default $'.padStart(11) + 'terse $'.padStart(11) + 'change'.padStart(9) + '95% CI'.padStart(22) + ' out tok'.padStart(10))
const terseRows = []
const solveTests = []
for (const m of MODELS_IN_ORDER) {
  if (!terseUsable.has(m)) continue
  for (const [base, terse] of [['dsh:native', 'dsh:native-terse'], ['dsh:ptc', 'dsh:ptc-terse']]) {
    const A = summarise(prim).find((r) => r.model === m && r.arm === base)
    const B = summarise(prim).find((r) => r.model === m && r.arm === terse)
    if (!A || !B) continue
    const d = pairedDiffs(prim, m, base, terse)
    const ci = bootstrapTaskMean(d)
    const md = mean([...d.values()])
    const rel = md / A.billed * 100
    terseRows.push({ model: m, label: MODELS[m].label, contrast: base + ' -> ' + terse, ratio: MODELS[m].card.out / MODELS[m].card.miss, tasks: d.size, base: A.billed, terse: B.billed, relPct: rel, ciLoPct: ci.lo / A.billed * 100, ciHiPct: ci.hi / A.billed * 100, outBase: A.outTok, outTerse: B.outTok, outChangePct: (B.outTok - A.outTok) / A.outTok * 100, solveBase: A.solveRate, solveTerse: B.solveRate })
    // THE TEST THAT WAS MISSING. The first version stored solveBase/solveTerse and never printed or
    // tested them, so "not one moves solve rate" was eyeballed - and it was false on the flagship
    // contrast. McNemar, paired by (task, seed) cell.
    {
      const cellSolved = new Map()
      for (const r of prim) {
        if (r.model !== m) continue
        if (r.arm !== base && r.arm !== terse) continue
        const k = r.task + '|' + r.seed
        const c = cellSolved.get(k) ?? {}
        c[r.arm] = r.solved
        cellSolved.set(k, c)
      }
      const both = [...cellSolved.values()].filter((c) => c[base] !== undefined && c[terse] !== undefined)
      const b = both.filter((c) => c[base] && !c[terse]).length   // solved then, not now
      const cc = both.filter((c) => !c[base] && c[terse]).length  // not then, solved now
      const nn = b + cc
      // Exact binomial two-sided.
      let p = 1
      if (nn > 0) {
        let cum = 0
        const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r }
        for (let k = 0; k <= Math.min(b, cc); k++) cum += C(nn, k)
        p = Math.min(1, 2 * cum / Math.pow(2, nn))
      }
      solveTests.push({ id: 'solve:' + m + ':' + base + '->' + terse, model: m, label: MODELS[m].label, contrast: base + ' -> ' + terse, cells: both.length,
        baseSolved: both.filter((c) => c[base]).length, terseSolved: both.filter((c) => c[terse]).length,
        b, c: cc, p })
    }
    console.log('  ' + MODELS[m].label.padEnd(20) + (base + ' -> ' + terse).padEnd(26) + String(d.size).padStart(6) +
      ('$' + A.billed.toFixed(5)).padStart(11) + ('$' + B.billed.toFixed(5)).padStart(11) +
      ((rel >= 0 ? '+' : '') + rel.toFixed(1) + '%').padStart(9) +
      ('[' + (ci.lo / A.billed * 100).toFixed(1) + '%, ' + (ci.hi / A.billed * 100).toFixed(1) + '%]').padStart(22) +
      (((B.outTok - A.outTok) / A.outTok * 100 >= 0 ? '+' : '') + ((B.outTok - A.outTok) / A.outTok * 100).toFixed(1) + '%').padStart(10))
  }
}
console.log('')
console.log('  SOLVE RATE, paired by (task, seed) - McNemar exact. The claim "not one moves solve rate"')
console.log('  was never tested before; this is the test.')
console.log('  ' + 'model'.padEnd(20) + 'contrast'.padEnd(26) + 'cells'.padStart(6) + 'default'.padStart(9) + 'terse'.padStart(8) + 'b/c'.padStart(9) + 'p'.padStart(9))
for (const t of solveTests) {
  console.log('  ' + t.label.padEnd(20) + t.contrast.padEnd(26) + String(t.cells).padStart(6) +
    String(t.baseSolved).padStart(9) + String(t.terseSolved).padStart(8) + (t.b + '/' + t.c).padStart(9) +
    t.p.toFixed(4).padStart(9) + (t.p < 0.05 ? '  (raw p<0.05 - see the family table)' : ''))
}
out.sections.A4 = terseRows
out.sections.A4solve = solveTests

// ---- the FAMILY: every secondary/pairwise contrast reported together, corrected together ------
// PRE-REGISTRATION.md section 6. Membership is stated because the family SIZE is the correction:
// m contrasts put the smallest p against alpha/m, so a contrast left out of the family is a
// contrast reported without the correction the filing requires. The A4 cost contrasts and the A8
// adjacent pairs are DESCRIPTIVE intervals carrying no p-value and cannot enter a Holm family;
// that exclusion is declared here rather than left implicit.
{
  const tests = [
    ...out.sections.A2b.map((r) => ({ id: r.id, label: r.label + ' ' + r.contrast, block: r.block, p: r.p, se: r.se })),
    ...solveTests.map((t) => ({ id: t.id, label: t.label + ' ' + t.contrast, block: 'A4', p: t.p, se: null })),
  ]
  const holm = holmFamily(tests)
  console.log('')
  console.log('########## THE FAMILY - every secondary/pairwise contrast reported together ##########')
  console.log('  PRE-REGISTRATION.md section 6. m = ' + holm.m + ' = ' + out.sections.A2b.length +
    ' cost contrasts (A2b) + ' + solveTests.length + ' solve-rate contrasts (A4).')
  console.log('  ' + 'contrast'.padEnd(56) + 'block'.padStart(6) + 'p'.padStart(10) + 'alpha/(m-i+1)'.padStart(14) + '  verdict')
  for (const r of holm.rows) {
    const note = r.resolvable === false ? '   [within 2se of the threshold: not resolvable at this draw count]' : ''
    console.log('  ' + r.label.slice(0, 55).padEnd(56) + r.block.padStart(6) + r.p.toFixed(4).padStart(10) +
      r.threshold.toFixed(5).padStart(14) + '  ' + (r.passes ? 'significant' : 'fails Holm') + note)
  }
  console.log('  -> ' + holm.survivors + ' of ' + holm.m + ' survive Holm at alpha=' + holm.alpha + '.' +
    (holm.unresolvable ? '  ' + holm.unresolvable + ' verdict(s) sit within 2 Monte Carlo standard errors of their threshold.' : ''))
  // DECLARED SENSITIVITY, not a second result: the family definition decides verdicts, so the
  // narrower per-block reading is printed beside it rather than left for a reader to discover.
  const perBlock = holmFamily(out.sections.A2b.map((r) => ({ id: r.id, p: r.p, se: r.se })))
  const perBlock2 = holmFamily(solveTests.map((t) => ({ id: t.id, p: t.p })))
  console.log('  sensitivity - if each block were corrected as its OWN family instead: A2b ' +
    perBlock.survivors + ' of ' + perBlock.m + ' (alpha/' + perBlock.m + ' = ' + (0.05 / perBlock.m).toFixed(5) + '), A4 ' +
    perBlock2.survivors + ' of ' + perBlock2.m + ' (alpha/' + perBlock2.m + ' = ' + (0.05 / perBlock2.m).toFixed(5) + ').')
  out.sections.family = holm
  // Attach the corrected verdict to the contrast it belongs to, so a block table can never be
  // read as if its raw p had been corrected.
  for (const r of holm.rows) {
    const cost = out.sections.A2b.find((x) => x.id === r.id)
    if (cost) { cost.holmThreshold = r.threshold; cost.holmPasses = r.passes }
    const solve = solveTests.find((x) => x.id === r.id)
    if (solve) { solve.holmThreshold = r.threshold; solve.holmPasses = r.passes }
  }
}

// ---- A5: cost per run vs cost per solved task -----------------------------------------------
console.log('\n########## A5  cost per RUN vs cost per SOLVED TASK ##########')
console.log('  ' + 'model'.padEnd(20) + 'arm'.padEnd(18) + '$/run'.padStart(10) + '$/solved'.padStart(10) + 'solve'.padStart(8) + 'rank /run'.padStart(10) + 'rank /solved'.padStart(13) + 'shift'.padStart(7))
const a5 = []
for (const m of MODELS_IN_ORDER) {
  const t = armTable(m)
  if (!t.length) continue
  const byRun = [...t].sort((a, b) => a.billed - b.billed)
  const bySolved = [...t].sort((a, b) => a.billed / Math.max(a.solveRate, 1e-9) - b.billed / Math.max(b.solveRate, 1e-9))
  for (const r of t) {
    const rr2 = byRun.indexOf(r) + 1, rs = bySolved.indexOf(r) + 1
    a5.push({ model: m, label: MODELS[m].label, arm: r.arm, perRun: r.billed, perSolved: r.billed / Math.max(r.solveRate, 1e-9), solveRate: r.solveRate, rankRun: rr2, rankSolved: rs, shift: rs - rr2 })
  }
  const cheapestRun = byRun[0], cheapestSolved = bySolved[0]
  const maxShift = Math.max(...t.map((r) => Math.abs(bySolved.indexOf(r) - byRun.indexOf(r))))
  console.log('  ' + MODELS[m].label.padEnd(20) + 'solve-rate range ' + (Math.min(...t.map((r) => r.solveRate)) * 100).toFixed(0) + '-' + (Math.max(...t.map((r) => r.solveRate)) * 100).toFixed(0) + '%' +
    '  |  cheapest by $/run: ' + cheapestRun.arm.padEnd(17) + ' by $/solved: ' + cheapestSolved.arm.padEnd(17) +
    (cheapestRun.arm === cheapestSolved.arm ? ' (same)' : ' *** CHANGES ***') + '  max rank shift ' + maxShift)
}
out.sections.A5 = a5

// ---- A6: cache regime ------------------------------------------------------------------------
// `overall` pools EVERY arm of a model into one number, and on Anthropic that number mixes two
// cache regimes: only the six DSH arms POST to /v1/messages, which is the one path
// tools/measure-gateway.mjs can inject a cache_control breakpoint on (the gate is
// url.includes('/messages') && cacheBreakpoints), while the four external harnesses there speak
// /v1/chat/completions and so read 0% on every cell BY CONSTRUCTION. Sonnet's 51.3% is 480 cells
// at ~85.5% plus 320 at 0%: a reader compared it against the matrix's 757/800 solve rate and filed
// the gap as an anomaly about Sonnet, when it is a fact about the gateway's two protocol paths.
// The pooled value is KEPT - it is filed and must not move - and the split is printed beside it so
// that a 0% on one side can no longer be read as "this harness refuses to cache".
// The arithmetic lives in tools/cache-regime.mjs, where it is tested on its own.
console.log('\n########## A6  Cache regime per model (primary cells, mean hit rate) ##########')
console.log('  ' + 'model'.padEnd(20) + 'provider'.padEnd(11) + 'overall'.padStart(9) +
  'dsh hit'.padStart(9) + 'cells'.padStart(7) + 'non-dsh'.padStart(9) + 'cells'.padStart(7) +
  'best arm'.padStart(10) + 'worst arm'.padStart(10) + 'spread'.padStart(9) + '  automatic?')
const a6 = []
for (const m of MODELS_IN_ORDER) {
  const rows = armTable(m)
  if (!rows.length) continue
  const hrs = rows.map((r) => r.hitRate)
  const best = rows.reduce((a, b) => (b.hitRate > a.hitRate ? b : a)), worst = rows.reduce((a, b) => (b.hitRate < a.hitRate ? b : a))
  // FILED VALUE - left exactly as it was. The split below is additive and must never be merged into
  // this expression: every recorded analysis, and the figures citing it, would move.
  const overall = mean(prim.filter((r) => r.model === m).map((r) => r.hitRate ?? 0))
  const auto = MODELS[m].provider === 'Anthropic' ? 'NO - client must declare' : 'yes'
  const split = cacheRegimeSplit(prim.filter((r) => r.model === m))
  const note = MODELS[m].provider === 'Anthropic'
    ? 'non-dsh arms speak /v1/chat/completions, which cannot carry a cache_control breakpoint: a 0% there measures the measurement path, not a refusal to cache'
    : 'both sides hit cache here without an injected breakpoint: the split separates harnesses, not cache regimes'
  a6.push({ model: m, label: MODELS[m].label, provider: MODELS[m].provider, overall, best: best.hitRate, worst: worst.hitRate, bestArm: best.arm, worstArm: worst.arm, spread: best.hitRate - worst.hitRate, automatic: auto,
    dshHitRate: split.dshHitRate, dshCells: split.dshCells, nonDshHitRate: split.nonDshHitRate, nonDshCells: split.nonDshCells, note })
  // A side with no cells prints n/a, never 0.0% - the two must not look the same.
  const pct = (v) => (v == null ? 'n/a' : (v * 100).toFixed(1) + '%')
  console.log('  ' + MODELS[m].label.padEnd(20) + MODELS[m].provider.padEnd(11) + (overall * 100).toFixed(1).padStart(8) + '%' +
    pct(split.dshHitRate).padStart(9) + String(split.dshCells).padStart(7) +
    pct(split.nonDshHitRate).padStart(9) + String(split.nonDshCells).padStart(7) +
    (best.hitRate * 100).toFixed(1).padStart(9) + '%' + (worst.hitRate * 100).toFixed(1).padStart(9) + '%' +
    ((best.hitRate - worst.hitRate) * 100).toFixed(1).padStart(8) + 'pp  ' + auto)
}
console.log('')
console.log('  dsh / non-dsh split by arm prefix, with the cell count on each side. On Anthropic only')
console.log('  /v1/messages can carry an injected cache_control breakpoint, and only DSH speaks it, so')
console.log('  the non-dsh 0% there is the measurement path - not a harness decision about caching.')
out.sections.A6 = a6

// ---- A7: is there a placebo in the current data? ----------------------------------------------
// A placebo is a MEASUREMENT, not a claim: meta[id].terseReal === false says every terse-arm record
// in that dataset ran with terse:false, i.e. the prompt suffix never reached the arm. ds-full used
// to qualify - it was collected before the runner's arm list carried promptSuffix - but it was
// re-collected on 2026-10-02 (commit 1132da0) and all 124 of its terse-arm records now carry
// terse:true, so it does not qualify any more. The floor is therefore computed only from contrasts
// the DATA certifies as placebos. The previous version asserted the ds-full sham in prose and so
// reported a real -46.2% terseness effect as a 46.2% "noise floor" - a number that would have
// nullified every arm-level comparison in the study.
console.log('\n########## A7  The placebo: arms that received IDENTICAL treatment ##########')
const shamIds = Object.entries(meta).filter(([, m]) => m.terseReal === false).map(([id]) => id)
const shamModels = [...new Set(shamIds.map((id) => meta[id].model))]
console.log('  datasets whose terse arms provably received the base prompt (terseReal=false): ' +
  (shamIds.length ? shamIds.join(', ') : 'NONE in the current data'))
const placebo = []
if (shamModels.length) {
  console.log('  ' + 'contrast'.padEnd(30) + 'tasks'.padStart(6) + 'arm A $'.padStart(11) + 'arm B $'.padStart(11) + 'difference'.padStart(12) + '95% CI'.padStart(22))
  for (const m of shamModels) {
    for (const [a, b] of [['dsh:native', 'dsh:native-terse'], ['dsh:ptc', 'dsh:ptc-terse']]) {
      const A = summarise(prim).find((r) => r.model === m && r.arm === a)
      const B = summarise(prim).find((r) => r.model === m && r.arm === b)
      if (!A || !B) continue
      const d = pairedDiffs(prim, m, a, b)
      if (!d.size) continue
      const ci = bootstrapTaskMean(d)
      const md = mean([...d.values()])
      placebo.push({ model: m, a, b, label: a + ' vs ' + b, tasks: d.size, aMean: A.billed, bMean: B.billed,
        relPct: md / A.billed * 100, ciLoPct: ci.lo / A.billed * 100, ciHiPct: ci.hi / A.billed * 100,
        excludesZero: ci.lo > 0 || ci.hi < 0 })
      console.log('  ' + (a + ' vs ' + b).padEnd(30) + String(d.size).padStart(6) +
        ('$' + A.billed.toFixed(5)).padStart(11) + ('$' + B.billed.toFixed(5)).padStart(11) +
        ((md / A.billed * 100 >= 0 ? '+' : '') + (md / A.billed * 100).toFixed(1) + '%').padStart(12) +
        ('[' + (ci.lo / A.billed * 100).toFixed(1) + '%, ' + (ci.hi / A.billed * 100).toFixed(1) + '%]').padStart(22) +
        (ci.lo > 0 || ci.hi < 0 ? '  *' : '  n.s.'))
    }
  }
}
const floor = placebo.length ? Math.max(...placebo.map((p) => Math.abs(p.relPct))) : null
console.log('')
console.log(floor == null
  ? "  NO PLACEBO exists in the current data, so this analysis cannot measure a noise floor from one." +
    "\n  F29's 7.7% floor came from the pre-recollection placebo and is NOT recomputed or restated here."
  : '  NOISE FLOOR from the placebo: identical treatments differ by up to ' + floor.toFixed(1) + '%.')
out.sections.A7 = { placebo, noiseFloorPct: floor, shamDatasets: shamIds }

// ---- A8: are adjacent ranks actually distinguishable? ----------------------------------------
// F29 gives a noise floor of 7.7%. A rank table ignores it, so every adjacent pair in every
// provider's cost ordering is tested. A "cheapest arm" that is not distinguishable from the
// runner-up is not a result, and this is where that gets said.
console.log('\n########## A8  Are the ranked arms actually distinguishable from each other? ##########')
console.log('  Each provider, its arms in cost order, adjacent pairs tested as in A2 (paired by task).')
const a8 = []
let ties = 0, pairs = 0
for (const m of MODELS_IN_ORDER) {
  const t = armTable(m)
  if (t.length < 2) continue
  const lines = []
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1]
    const d = pairedDiffs(prim, m, a.arm, b.arm)
    if (!d.size) continue
    const ci = bootstrapTaskMean(d)
    const rel = (b.billed - a.billed) / a.billed * 100
    const distinct = ci.lo > 0 || ci.hi < 0
    pairs++; if (!distinct) ties++
    // NAME TRAP, documented 2026-10-05. `t` is in cost order (cheapest first), so `a` is the CHEAPER
    // arm and `b` the dearer one - but the field names say the opposite, so `higher` holds the cheaper
    // arm and `relPct` is how much more `lower` costs than `higher`. A reader checking F35 by hand
    // inverted three of four pair directions before catching it. Alias keys (`cheaper`/`dearer`) were
    // added and then REMOVED: they changed the serialized output, and the property that every recorded
    // analysis regenerates identically from the shipped data is worth more than the aliases. The
    // direction is pinned by a test against A5's per-arm costs instead.
    a8.push({ model: m, higher: a.arm, lower: b.arm, relPct: rel,
      ciLoPct: ci.lo / a.billed * 100, ciHiPct: ci.hi / a.billed * 100, distinct })
    lines.push('    ' + a.arm.padEnd(17) + 'vs ' + b.arm.padEnd(17) + ((rel >= 0 ? '+' : '') + rel.toFixed(1) + '%').padStart(8) +
      ('[' + (ci.lo / a.billed * 100).toFixed(1) + '%, ' + (ci.hi / a.billed * 100).toFixed(1) + '%]').padStart(20) + (distinct ? '  distinct' : '  *** TIE ***'))
  }
  console.log('  ' + MODELS[m].label)
  console.log(lines.join('\n'))
}
console.log('')
console.log('  ' + ties + ' of ' + pairs + ' adjacent pairs in the study\'s own rank tables are TIES at 95%.')
console.log('  Reporting a cost ranking without this test reports ordering that the data does not support.')
out.sections.A8 = { pairs, ties, details: a8 }

// ---- write -----------------------------------------------------------------------------------
const ji = process.argv.indexOf('--json')
if (ji >= 0) {
  const p = process.argv[ji + 1] ?? 'analysis/panel-analysis.json'
  try { refuseFiledWrite(p, SELECTION) } catch (e) { refuse(e.message) }
  mkdirSync(p.split(/[\\/]/).slice(0, -1).join('/') || '.', { recursive: true })
  writeFileSync(p, JSON.stringify(out, null, 1))
  console.log('\nwrote ' + p)
}
