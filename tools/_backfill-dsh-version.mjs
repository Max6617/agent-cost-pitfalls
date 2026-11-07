import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { dshBinJs } from './lib-yaml.mjs'

const runsPath = 'results/ds-full/runs.jsonl'
const matrixPath = 'results/ds-full/matrix.json'
const runs = readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const dsh = runs.filter((r) => r.harness === 'dsh')
const nulls = dsh.filter((r) => !r.harnessVersion)
console.log('dsh records without a version: ' + nulls.length + ' / ' + dsh.length)
const ts = runs.map((r) => r.ts).filter(Boolean).sort()
const from = ts[0], to = ts[ts.length - 1]
console.log('matrix window: ' + from + '  ->  ' + to)
const bin = dshBinJs()
let d = dirname(bin), pj = null
for (let i = 0; i < 6 && d; i++) { const p = join(d, 'package.json'); if (existsSync(p)) { pj = p; break } d = dirname(d) }
if (!pj) { console.log('REFUSING: could not resolve the DSH package.json'); process.exit(2) }
const pkg = JSON.parse(readFileSync(pj, 'utf8'))
const st = statSync(pj)
console.log('resolved install  : ' + pj)
console.log('version           : ' + pkg.version)
console.log('package.json mtime: ' + st.mtime.toISOString())
const matrixEnd = new Date(to).getTime()
const installChangedDuring = st.mtimeMs > matrixEnd
const installPredatesMatrix = st.mtimeMs < new Date(from).getTime()
console.log('install predates the matrix : ' + installPredatesMatrix)
console.log('install changed during it   : ' + installChangedDuring)
if (installChangedDuring) { console.log('REFUSING to backfill: the DSH install was modified DURING the matrix, so the runs cannot all be attributed to one version. null is the honest value.'); process.exit(3) }
const mx = JSON.parse(readFileSync(matrixPath, 'utf8'))
mx.harnessVersionsPostHoc = {
  note: 'The per-record harnessVersion is null for DSH because the probe could not execute it during collection - DSH is not on PATH and is launched as node plus its bin.js. This block records what the INSTALL PROVES. No historical record was rewritten.',
  dsh: { version: pkg.version, evidence: pj, packageJsonMtime: st.mtime.toISOString(), installPredatesMatrix, installChangedDuringMatrix: installChangedDuring,
    conclusion: installPredatesMatrix ? ('the install predates the matrix and was unchanged through it, so every DSH run used ' + pkg.version) : ('the install predates the matrix but no change was detected during it; ' + pkg.version + ' is consistent with every run, not proven for each') },
  recordsAffected: nulls.length,
  probedAt: new Date().toISOString(),
}
writeFileSync(matrixPath, JSON.stringify(mx, null, 2) + '\n')
console.log('')
console.log('wrote harnessVersionsPostHoc to ' + matrixPath)
console.log('records NOT modified: harnessVersion stays null, which is what actually happened')