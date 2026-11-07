#!/usr/bin/env node
/**
 * make-presets — (re)create the optimized presets from the shipped originals.
 *
 * Copies a shipped preset directory, applies the edits in preset-spec.mjs, and
 * swaps in the persona from personas/<id>.txt. Every edit asserts exactly one
 * match, so an upstream preset change fails loudly instead of producing a
 * silently wrong composition.
 *
 * Usage:
 *   node tools/make-presets.mjs [--root <dir>] [--shipped <dir>] [--force] [--dry-run]
 *
 * --dry-run writes into a temporary directory and reports the result without
 * touching your real preset root.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync, renameSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { BASE, META, OPS, PERSONA_FIND, EXTRA_FILES, APPEND } from './preset-spec.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }

const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
const dryRun = flag('--dry-run')
const force = flag('--force')
const root = dryRun
  ? join(tmpdir(), 'dsh-preset-dryrun-' + Date.now())
  : opt('--root', join(home, '.agent-presets'))

function findShipped() {
  const explicit = opt('--shipped', null)
  if (explicit) return explicit
  const app = process.env.DSH_APP || join(process.env.USERPROFILE || '', 'dsh-app')
  const pnpm = join(app, 'node_modules', '.pnpm')
  if (existsSync(pnpm)) {
    for (const d of readdirSync(pnpm)) {
      if (!d.startsWith('@deepseek-ai+dsh-agent-pres')) continue
      const p = join(pnpm, d, 'node_modules', '@deepseek-ai', 'dsh-agent-presets', 'presets')
      if (existsSync(p)) return p
    }
  }
  return null
}

const shipped = findShipped()
if (!shipped) {
  console.error('Could not find the shipped presets. Pass --shipped <dir> or set DSH_APP.')
  process.exit(1)
}
console.log('shipped presets : ' + shipped)
console.log('target root     : ' + root + (dryRun ? '   (DRY RUN)' : ''))
console.log()

let failed = 0
for (const [id, base] of Object.entries(BASE)) {
  const src = join(shipped, base)
  const dst = join(root, id)
  if (!existsSync(src)) { console.log('SKIP ' + id + ' - shipped base "' + base + '" missing'); failed++; continue }
  if (existsSync(dst) && !force && !dryRun) {
    console.log('SKIP ' + id + ' - already exists (pass --force to overwrite)')
    continue
  }
  // Carry forward a manually-set ledgerPath. Regenerating a preset used to reset
  // it to null, silently un-instrumenting the router for anyone who had turned
  // the ledger on. The preset file is the user's too.
  let priorLedger = null
  if (existsSync(join(dst, 'agent.cordis.yml'))) {
    const prior = readFileSync(join(dst, 'agent.cordis.yml'), 'utf8')
    const m = /^\s*ledgerPath:\s*(?!null\s*$)(.+)$/m.exec(prior)
    if (m) priorLedger = m[1].trim()
  }
  // NO DELETE. This used to be `rmSync(dst, {recursive:true, force:true})` against a preset
  // directory the user owns. That is a destructive call on a non-scratch path - the shape of
  // the 2026-10-02 loss - and it made --force irreversible. The previous preset is moved
  // aside instead, so overwriting one is always undoable by hand.
  if (existsSync(dst)) {
    const aside = dst + '.replaced-' + new Date().toISOString().replace(/[:.]/g, '-')
    renameSync(dst, aside)
    console.log('  kept the previous ' + id + ' as ' + aside)
  }
  mkdirSync(root, { recursive: true })
  cpSync(src, dst, { recursive: true })

  const file = join(dst, 'agent.cordis.yml')
  let text = readFileSync(file, 'utf8')
  let bad = 0
  for (const [find, replace, label] of OPS[id]) {
    const n = text.split(find).length - 1
    if (n !== 1) { console.log('  FAIL ' + id + ': ' + label + ' (matched ' + n + 'x, expected 1)'); bad++; continue }
    text = text.replace(find, replace)
  }

  const personaFile = join(here, 'personas', id + '.txt')
  if (!existsSync(personaFile)) { console.log('  FAIL ' + id + ': missing personas/' + id + '.txt'); bad++ }
  else {
    const persona = readFileSync(personaFile, 'utf8').replace(/[\r\n]+$/, '')
    const block = '    suffix: Your working directory is {{cwd}}.\n' +
      '    prefix: |-\n' +
      persona.split('\n').map((l) => (l.length ? '      ' + l : '')).join('\n')
    if (text.split(PERSONA_FIND).length - 1 !== 1) { console.log('  FAIL ' + id + ': persona block not found exactly once'); bad++ }
    else text = text.replace(PERSONA_FIND, block)
  }

  for (const f of EXTRA_FILES[id] ?? []) {
    const from = join(here, '..', 'router', f)
    if (!existsSync(from)) { console.log('  FAIL ' + id + ': missing router/' + f); bad++; continue }
    cpSync(from, join(dst, f))
  }
  if (bad) { failed += bad; continue }
  if (APPEND[id]) text = text.replace(/\s*$/, '') + '\n' + APPEND[id] + '\n'
  if (priorLedger) {
    text = text.replace(/^(\s*ledgerPath:\s*)null\s*$/m, '$1' + priorLedger)
    console.log('       (kept ledgerPath: ' + priorLedger + ')')
  }
  writeFileSync(file, text)
  const m = META[id]
  writeFileSync(join(dst, 'preset.yml'),
    'name: ' + m.name + '\ndescription: ' + m.description + '\norder: ' + m.order + '\n')
  const extras = (EXTRA_FILES[id] ?? []).length
  console.log('  ok   ' + id.padEnd(14) + 'from ' + base + '  (' + OPS[id].length + ' edits' +
    (extras ? ', +' + extras + ' router files' : '') + ')')
}

if (dryRun) {
  console.log()
  for (const id of Object.keys(BASE)) {
    const f = join(root, id, 'agent.cordis.yml')
    if (existsSync(f)) console.log('  dry-run output: ' + f + '  (' + statSync(f).size + ' bytes)')
  }
}
console.log()
console.log(failed ? failed + ' FAILURE(S)' : (dryRun ? 'DRY RUN COMPLETE - nothing written to your preset root' : 'PRESETS WRITTEN - validate with: node tools/validate-presets.mjs'))
process.exit(failed ? 1 : 0)
