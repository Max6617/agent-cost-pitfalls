#!/usr/bin/env node
/**
 * retarget — rewrite every task.json "test" field to the repo-relative grader.
 *
 * spec.test runs with a temp copy of fixture/ as its cwd, so the command cannot
 * be a path relative to that directory. task.json stores
 * `node tasks-hard/_grade/run.mjs <id>`, and the runners resolve that against
 * the repository root. This rewrites a drifted (usually absolute) test field
 * back to that form.
 *
 *   node tasks-hard/_tools/retarget.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const batchRoot = resolve(here, '..')

const ids = readdirSync(batchRoot).filter((d) => existsSync(join(batchRoot, d, 'task.json'))).sort()
let n = 0
for (const id of ids) {
  const p = join(batchRoot, id, 'task.json')
  const spec = JSON.parse(readFileSync(p, 'utf8'))
  const want = 'node tasks-hard/_grade/run.mjs ' + id
  if (spec.test !== want) { spec.test = want; writeFileSync(p, JSON.stringify(spec, null, 2) + '\n'); n++ }
}
console.log('retargeted ' + n + ' of ' + ids.length + ' task(s) to node tasks-hard/_grade/run.mjs <id>')
