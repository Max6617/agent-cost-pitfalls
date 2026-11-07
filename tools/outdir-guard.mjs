/**
 * outdir-guard.mjs - a matrix output directory is OWNED BY THE PLAN THAT CREATED IT.
 *
 * THE DEFECT THIS CLOSES. tools/collect.mjs resolves every plan through one registry of historical
 * directory names (HISTORICAL_DIR: deepseek -> ds-full, and so on). `--plan hard` therefore resolves
 * to results/ds-full - the signed-off, 620-cell batch-1 matrix - and run-experiment.mjs is launched
 * with --resume, which reads that runs.jsonl and treats 240 hard-suite cells as work already done.
 * On 2026-10-04 this was caught by hand seconds before launch and the pilot was isolated with
 * `--name-prefix hardpilot-`. The defect itself was left open and the handover named it the first
 * thing to fix: "the hard plan should map to its own names or refuse to run without a prefix".
 *
 * Refusing is the stronger fix, and it does not depend on knowing the historical names: it asks the
 * directory itself which plan owns it. collection.json has recorded `plan` since the registry was
 * written, so the check is a comparison, not a guess. It runs before any stage - including under
 * --dry-run, which is where a collision is free to find.
 *
 * WHAT IT IS NOT. It never deletes, never moves and never repairs a directory. A refusal is always
 * the safe outcome: the operator re-runs with --name-prefix and the existing matrix is untouched.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The plan a directory records, or null if it records none. Never throws. */
export function readCollection (dir) {
  const p = join(dir, 'collection.json')
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return { unreadable: true }
  }
}

/** How results/<name> is spelled in a message, whatever separator the platform uses. */
function shown (dir) {
  const parts = String(dir).replace(/\\/g, '/').split('/')
  const i = parts.lastIndexOf('results')
  return i >= 0 ? 'results/' + parts.slice(i + 1).join('/') : String(dir)
}

/**
 * @param {{dir: string, plan: string, cells?: number, ownerName?: string, namePrefix?: string,
 *          collection?: object|null, hasRuns?: boolean}} o
 * @returns {{ok: true, code: 'ok', owner: string} |
 *           {ok: false, code: string, message: string}}
 */
export function outputDirVerdict (o) {
  const { dir, plan, collection = null, hasRuns = false } = o
  const name = shown(dir)
  const here = o.ownerName ? name + ' (' + o.ownerName + ')' : name
  const remedy = 'Collect this plan into its own directory instead: add --name-prefix, for example ' +
    '--name-prefix ' + (o.namePrefix ? o.namePrefix : 'pilot-') + ' (this lands it beside ' + name + ', as results/' +
    (o.namePrefix || 'pilot-') + (o.ownerName ?? name.split('/').pop()) + ').'
  if (collection && collection.unreadable) {
    return {
      ok: false,
      code: 'unreadable-collection',
      message: here + ' holds a collection.json that does not parse, so there is no way to tell which plan ' +
        'owns it. Refusing to write into a directory of unknown provenance. ' + remedy,
    }
  }
  if (collection && !collection.plan) {
    return {
      ok: false,
      code: 'no-recorded-plan',
      message: here + ' holds a collection.json with no "plan" field, so there is no way to tell which plan ' +
        'owns it. Refusing to write into a directory of unknown provenance. ' + remedy,
    }
  }
  if (collection && collection.plan !== plan) {
    return {
      ok: false,
      code: 'plan-mismatch',
      message: here + ' is the output of plan "' + collection.plan + '" (matrix ' + (collection.matrixId ?? 'unknown') +
        ', ' + (collection.cells ?? '?') + ' cells, launched ' + (collection.launchedAt ?? 'unknown') + '), and this run ' +
        'is plan "' + plan + '"' + (o.cells ? ' (' + o.cells + ' cells)' : '') + '. Collecting here would merge a second ' +
        'plan into a finished matrix, and --resume would read its cells as work already done. ' + remedy,
    }
  }
  if (!collection && hasRuns) {
    return {
      ok: false,
      code: 'unknown-provenance',
      message: here + ' holds a runs.jsonl but no collection.json, so there is no way to tell which plan owns it. ' +
        'Refusing to write into a directory of unknown provenance. ' + remedy,
    }
  }
  return { ok: true, code: 'ok', owner: collection ? String(collection.plan) : 'fresh' }
}
