/**
 * credit-plan.mjs - how much to load onto each provider, and where every number came from.
 *
 * THE ANSWER, FIRST. These are USD. The session brief writes them with a euro sign; the
 * repo holds no euro figure and no exchange rate anywhere, so USD is the only honest unit.
 *
 *   DeepSeek    load $30     batch-1 620 cells $5.39  + hard 240 cells $17.52  = $22.91, +30%
 *   z.ai (GLM)  load $40     batch-1 $5.52  + hard $24.00 (study's own plan)   = $29.52, +30%
 *   Alibaba     load $45     batch-1 $8.10  + hard $24.82                      = $32.91, +30%
 *   OpenAI      load $20     batch-1 $3.90  + hard $7.67                       = $11.57, +30%
 *   Anthropic   load $585    batch-1 only, Haiku+Sonnet = $448.93             +30%
 *               load $1603   batch-1 AND hard, both models = $1233.17         +30%
 *
 * The four cheap providers together are $22.90 for a full batch-1 sweep and $96.91 for
 * batch-1 plus the hard suite. Anthropic alone is $448.93 for batch-1 and $784.24 for the
 * hard suite. That is the entire argument for running the cheap four first, and it is not
 * close: Anthropic is 95% of the money for the same 620 cells.
 *
 * THE MARGIN IS +30%, and it is the repo's own convention - tools/load-plan.mjs:27 multiplies
 * its subtotal by 1.3 - not a number invented here.
 *
 * THREE THINGS THIS TABLE IS NOT.
 *
 * 1. It is NOT a balance. Nothing in this repository records a live balance: tools/balances.mjs
 *    is a hardcoded PLAN from 2026-09-30 (Anthropic 202.54, Qwen 0.00, Z.AI 32.00, OpenAI
 *    70.00, DeepSeek 12.99) and is two days older than HEAD. The last live reading anywhere is
 *    in the recovered session transcript at 2026-10-02T07:45:33Z: DeepSeek USD 20.08 topped up,
 *    Anthropic FUNDED, and "~$57 of your $75 left" at 07:48Z. Only DeepSeek exposes a balance
 *    endpoint (GET https://api.deepseek.com/user/balance); for the other four a 1-token probe
 *    is the only signal, which is what tools/check-providers.mjs does.
 *
 * 2. It is NOT measured for five of the six models. Batch-1 per-run cost for DeepSeek, Qwen,
 *    luna, Haiku and Sonnet is not primary data any more: the per-matrix gateway logs were
 *    destroyed. It survives as a 10-arm aggregate in the recovered cost-panel printout and as
 *    per-arm output tokens in analysis/panel-analysis.json A4, with input tokens DERIVED by
 *    inverting the price card. Only GLM-5.3-Flash has an exact token profile (data/milestone-4,
 *    n=310: 137,577 input, 4,357 output, 10.83 requests/run).
 *
 * 3. ANTHROPIC IS NOW SETTLED, BY MEASUREMENT (2026-10-03). The card-priced figures are
 *    $0.454261/run (Haiku) and $0.269822/run (Sonnet). notes/records/FINDINGS.md:448-451 recorded a
 *    console-vs-log gap of 1.611x and concluded "every per-run figure needs scaling by 1.61";
 *    notes/reviews/CRITICAL-REVIEW.md:450-454 disputed it as a hardcoded constant with no capture behind it.
 *    A 62-cell pilot was then run and reconciled against the console: credits fell $35.58
 *    ($38.65 -> $3.07) against a computed $35.5718, a ratio of 1.000, and the console reads to
 *    the cent, so the ratio is known to +/-0.014%. THE 1.611x IS REFUTED and the dispute was
 *    right; anything still scaled by 1.611 overstates Anthropic by 61%. Haiku for 620 cells is
 *    $281.64, not "either $286 or $461". Use the CREDIT ledger, not the spend counter - the
 *    latter did not move at all across a $35.58 run. See _ev/anthropic-pilot-2026-10-03.md.
 *
 * DO NOT BUDGET FROM THESE STALE TOOLS: load-plan.mjs (haiku 0.04844 = 9.4x low),
 * master-budget.mjs, budget-150.mjs, waste.mjs, glm53-plan.mjs (GLM-5.3 0.10942 vs 0.09581).
 */

/** The batch-1 suite: 31 tasks x 10 arms x 2 seeds. */
export const BATCH1_CELLS = 620
/** The hard suite: 24 tasks x 10 arms. */
export const HARD_CELLS = 240

export const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek', model: 'deepseek-flash', currency: 'USD',
    costPerRunBatch1: 0.008694, costPerRunHard: 0.0730, hardCostNote: 'notes/records/FINDINGS.md:676 $0.073/run; f18.json measured $0.0459 on one task',
    evidence: 'sessions-text.txt:1992394; panel-analysis.json A5 0.00870',
    balanceApi: { kind: 'http', url: 'https://api.deepseek.com/user/balance', field: 'balance_infos[0].total_balance' },
    console: 'https://platform.deepseek.com/top_up',
    keyFrom: '~/.dsh/.credentials.yaml -> DEEPSEEK_API_KEY (via tools/check-providers.mjs:28-43)',
  },
  zai: {
    label: 'Z.AI / GLM', model: 'glm-5.3-flash', currency: 'USD',
    costPerRunBatch1: 0.00890, costPerRunHard: 0.1000, hardCostNote: "the study's own planning figure; per-request $0.0020 x ~26.8 req/run gives ~$0.054",
    evidence: 'sessions-text.txt:1992395-1992397; data/milestone-4 exact token profile, core-5 arms $2.49/310 = $0.008032',
    balanceApi: null, // 'no balance endpoint exposed to us' - sessions-text.txt:1946178
    console: 'https://z.ai/manage-apikey/cost',
    keyFrom: '.keys.json -> zai',
  },
  qwen: {
    label: 'Alibaba / Qwen', model: 'qwen3.8-flash', currency: 'USD',
    costPerRunBatch1: 0.013057, costPerRunHard: 0.1034, hardCostNote: 'per-request $0.0022 x 47 req/run',
    evidence: 'sessions-text.txt:1992399; panel-analysis.json A5 0.01314',
    caveat: 'qwen-full ran 620 cells and the provider charged NOTHING (sessions-text.txt:1836891). The figure above is card-priced accounting cost, not an observed charge.',
    balanceApi: null, console: 'https://bailian.console.alibabacloud.com/', keyFrom: '.keys.json -> qwen',
  },
  openai: {
    label: 'OpenAI / luna', model: 'gpt-6-luna', currency: 'USD',
    costPerRunBatch1: 0.006290, costPerRunHard: 0.031965, hardCostNote: 'f18.json, 57 runs',
    evidence: 'sessions-text.txt:1992402; panel-analysis.json A5 0.00630',
    balanceApi: null, console: 'https://platform.openai.com/settings/organization/billing', keyFrom: '.keys.json -> openai',
  },
  // A second entry for the SAME account, so Sonnet's matrix lands in its own dataset directory
  // (results/sonnet-full) instead of overwriting the Haiku one. The key is shared - see
  // KEY_ALIASES in tools/keys.mjs.
  'anthropic-sonnet': {
    label: 'Anthropic / Sonnet', model: 'claude-sonnet-5.5', currency: 'USD',
    costPerRunBatch1: 0.269822, costPerRunHard: 1.304599,
    hardCostNote: 'f18.json: $1.304599/run (30 runs) on one hard task',
    evidence: 'card-priced per-run; see _ev/anthropic-pilot-2026-10-03.md',
    balanceApi: null, console: 'https://console.anthropic.com/settings/billing', keyFrom: '.keys.json -> anthropic',
  },
  anthropic: {
    label: 'Anthropic', model: 'claude-haiku-4.5 + claude-sonnet-5.5', currency: 'USD',
    costPerRunBatch1: 0.454261 + 0.269822, costPerRunHard: 1.963078 + 1.304599,
    hardCostNote: 'f18.json: haiku $1.963078/run (6 runs), sonnet $1.304599/run (30 runs) - one task, two models',
    evidence: 'sessions-text.txt:1992400-1992401; notes/records/FINDINGS.md:2001-2003 ($286 haiku, $167 sonnet for 620 cells each)',
    balanceApi: null, console: 'https://console.anthropic.com/settings/billing', keyFrom: '.keys.json -> anthropic',
    openRisk: 'notes/records/FINDINGS.md:448-451 records a 1.611x console-over-log gap and says every per-run figure needs scaling by it; notes/reviews/CRITICAL-REVIEW.md:450-454 disputes that as a hardcoded constant with no capture. 620 Haiku cells are $286 or $461 - UNRESOLVED.',
    notBefore: 'Never spend on Anthropic until a complete, verified, cheap matrix exists end to end.',
  },
}

export const MARGIN = 1.30

/** Recommended load for one provider over a set of suites. */
export function recommend (id, { batch1 = false, hard = false } = {}) {
  const p = PROVIDERS[id]
  if (!p) throw new Error('unknown provider ' + id)
  const runs = (batch1 ? BATCH1_CELLS : 0) + (hard ? HARD_CELLS : 0)
  const cost = (batch1 ? BATCH1_CELLS * p.costPerRunBatch1 : 0) + (hard ? HARD_CELLS * p.costPerRunHard : 0)
  return { id, label: p.label, runs, costUsd: cost, recommendedUsd: Math.ceil(cost * MARGIN), currency: 'USD' }
}

/** The order the brief mandates: cheap four first, Anthropic only if the paper rests on it. */
export const CHEAP_ORDER = ['deepseek', 'zai', 'openai', 'qwen']

if (process.argv[1] && /credit-plan\.mjs$/.test(process.argv[1])) {
  const mode = process.argv.includes('--hard') ? { batch1: true, hard: true } : { batch1: true }
  const rows = Object.keys(PROVIDERS).map((id) => recommend(id, mode))
  const cheap = rows.filter((r) => CHEAP_ORDER.includes(r.id))
  console.log('provider load plan (' + (mode.hard ? 'batch-1 + hard' : 'batch-1 only') + ', USD, margin x' + MARGIN + ')')
  console.log('  ' + 'provider'.padEnd(20) + 'runs'.padStart(6) + 'est. cost'.padStart(12) + 'load'.padStart(10))
  for (const r of rows) console.log('  ' + r.label.padEnd(20) + String(r.runs).padStart(6) + ('$' + r.costUsd.toFixed(2)).padStart(12) + ('$' + r.recommendedUsd).padStart(10))
  console.log('  ' + '-'.repeat(48))
  console.log('  ' + 'four cheap together'.padEnd(20) + String(cheap[0].runs).padStart(6) +
    ('$' + cheap.reduce((n, r) => n + r.costUsd, 0).toFixed(2)).padStart(12) +
    ('$' + cheap.reduce((n, r) => n + r.recommendedUsd, 0)).padStart(10))
  console.log('')
  for (const r of rows) {
    const p = PROVIDERS[r.id]
    if (p.caveat) console.log('  NOTE ' + p.label + ': ' + p.caveat)
    if (p.openRisk) console.log('  RISK ' + p.label + ': ' + p.openRisk)
    if (p.notBefore) console.log('  RULE ' + p.label + ': ' + p.notBefore)
  }
}
