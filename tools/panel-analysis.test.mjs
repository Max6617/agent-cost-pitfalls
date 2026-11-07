/**
 * panel-analysis.test.mjs - the Holm family as the analysis actually reports it.
 *
 * stats.test.mjs proves holmFamily behaves. This proves the CALL SITE puts every
 * secondary/pairwise contrast with a p-value into one family, which is the filed rule
 * (PRE-REGISTRATION.md section 6) and the thing a narrow family silently violated.
 *
 * Run: node --test tools/panel-analysis.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('..', import.meta.url))
const outPath = repo + 'results/_scratch/panel-analysis.test.json'

test('the reported Holm family contains every contrast the analysis tests', { timeout: 300000 }, () => {
  execFileSync(process.execPath, ['tools/panel-analysis.mjs', '--json', outPath], { cwd: repo, stdio: 'pipe' })
  const out = JSON.parse(readFileSync(outPath, 'utf8'))
  const fam = out.sections.family
  assert.ok(fam, 'panel-analysis must report its Holm family in the JSON')

  const cost = out.sections.A2b ?? []
  const solve = out.sections.A4solve ?? []
  assert.ok(cost.length > 0 && solve.length > 0, 'both contrast blocks must produce tests')
  assert.equal(fam.m, cost.length + solve.length,
    'the family must be the cost contrasts AND the solve-rate contrasts reported together')

  const ids = new Set(fam.rows.map((r) => r.id))
  for (const t of cost) assert.ok(ids.has(t.id), 'cost contrast missing from the family: ' + t.id)
  for (const t of solve) assert.ok(ids.has(t.id), 'solve-rate contrast missing from the family: ' + t.id)

  const flags = fam.rows.map((r) => r.passes)
  assert.deepEqual(flags, [...flags].sort((a, b) => Number(b) - Number(a)),
    'Holm verdicts must be a prefix of the sorted family (step-down)')
  assert.equal(fam.rows[0].threshold, 0.05 / fam.m, 'the smallest p is compared against alpha/m')

  // A8's `higher`/`lower` fields are named backwards: `higher` holds the CHEAPER arm (2026-10-05).
  // A reader checking F35 by hand inverted three of four pair directions before catching it, so the
  // direction is asserted here against A5's per-arm costs rather than trusted to the field names.
  const a8 = (out.sections.A8 ?? {}).details ?? []
  assert.ok(a8.length, 'A8 must report its adjacent pairs')
  const perRun = new Map()
  for (const row of out.sections.A5 ?? []) perRun.set(row.model + '|' + row.arm, row.perRun)
  // `higher` holds the CHEAPER arm and `lower` the dearer one - the names are inverted. The direction
  // is asserted against A5's per-arm costs, not trusted to the field names, and the alias keys that
  // once carried this were removed because they changed the serialized output.
  for (const d of a8) {
    const c = perRun.get(d.model + '|' + d.higher), e = perRun.get(d.model + '|' + d.lower)
    if (c == null || e == null) continue
    assert.ok(e >= c, d.model + ': `lower` must be the DEARER arm (' + d.higher + ' $' + c + ' vs ' + d.lower + ' $' + e + ')')
    const rel = ((e - c) / c) * 100
    assert.ok(Math.abs(rel - d.relPct) < 1,
      d.model + ' ' + d.higher + ' -> ' + d.lower + ': relPct ' + d.relPct.toFixed(3) + ' must equal the A5 recomputation ' + rel.toFixed(3))
  }
  // The pairs are adjacent in cost order, so each model's details form one chain.
  const byModel = new Map()
  for (const d of a8) { if (!byModel.has(d.model)) byModel.set(d.model, []); byModel.get(d.model).push(d) }
  for (const [m, xs] of byModel) {
    for (let i = 0; i + 1 < xs.length; i++) {
      assert.equal(xs[i].lower, xs[i + 1].higher, m + ': A8 pairs must chain along the cost order')
    }
  }
})
