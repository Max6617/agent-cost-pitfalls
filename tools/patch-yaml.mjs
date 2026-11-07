#!/usr/bin/env node
/**
 * patch-yaml — merge id-targeted entries into a Cordis profile patch file.
 *
 * A profile patch file (cordis.patch.yml) is a top-level YAML array of loader
 * patch entries. Merging by id means re-running is idempotent: an entry whose id
 * already exists is replaced, anything else in the file is preserved.
 *
 * Safety: refuses to rewrite a file whose YAML body uses the Cordis !!js
 * evaluation tag, because re-emitting would turn that expression into a plain
 * string. Merge such a file by hand instead.
 *
 * Usage:
 *   node tools/patch-yaml.mjs --patch <file> --entries <file> [--out <file>] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = (n) => argv.includes(n)

function loadYaml() {
  const explicit = opt('--jsyaml', null)
  if (explicit) return createRequire(join(explicit, 'package.json'))('js-yaml')
  const app = process.env.DSH_APP || join(process.env.USERPROFILE || '', 'dsh-app')
  const pnpm = join(app, 'node_modules', '.pnpm')
  if (existsSync(pnpm)) {
    for (const d of readdirSync(pnpm)) {
      if (!d.startsWith('js-yaml@')) continue
      const p = join(pnpm, d, 'node_modules', 'js-yaml')
      if (existsSync(join(p, 'package.json'))) return createRequire(join(p, 'package.json'))('js-yaml')
    }
  }
  try { return createRequire(join(app, 'package.json'))('js-yaml') } catch {}
  throw new Error('js-yaml not found; pass --jsyaml <dir>')
}

const yaml = loadYaml()
const jsTag = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: (d) => (d ?? '') })
const SCHEMA = yaml.DEFAULT_SCHEMA.extend([jsTag])

/** Split a leading comment/blank block from the YAML body. */
function split(text) {
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length && (lines[i].trim() === '' || lines[i].trimStart().startsWith('#'))) i++
  return { header: lines.slice(0, i).join('\n'), body: lines.slice(i).join('\n') }
}

const patchPath = opt('--patch', null)
const entriesPath = opt('--entries', null)
if (!patchPath || !entriesPath) { console.error('need --patch <file> and --entries <file>'); process.exit(2) }
if (!existsSync(patchPath)) { console.error('patch file not found: ' + patchPath); process.exit(2) }
if (!existsSync(entriesPath)) { console.error('entries file not found: ' + entriesPath); process.exit(2) }

const { header, body } = split(readFileSync(patchPath, 'utf8'))
if (/!!js\b/.test(body)) {
  console.error('REFUSING: the patch body uses !!js, which re-emitting would flatten into a string.')
  console.error('Merge the entries into ' + patchPath + ' by hand.')
  process.exit(3)
}

let existing
try { existing = yaml.load(body, { schema: SCHEMA }) } catch (e) { console.error('patch file is not valid YAML: ' + e.message); process.exit(2) }
if (existing == null) existing = []
if (!Array.isArray(existing)) { console.error('patch file must be a top-level YAML array'); process.exit(2) }

const staged = yaml.load(split(readFileSync(entriesPath, 'utf8')).body, { schema: SCHEMA })
if (!Array.isArray(staged) || !staged.length) { console.error('entries file must be a non-empty YAML array'); process.exit(2) }

const added = [], replaced = []
for (const entry of staged) {
  if (!entry || !entry.id) { console.error('every entry needs an id'); process.exit(2) }
  const i = existing.findIndex((x) => x && x.id === entry.id)
  if (i >= 0) {
    const before = JSON.stringify(existing[i].config ?? null)
    existing[i] = { ...existing[i], ...entry }
    replaced.push(entry.id + (before !== JSON.stringify(entry.config ?? null) ? ' (config changed)' : ' (unchanged)'))
  } else { existing.push(entry); added.push(entry.id) }
}

const out = header.replace(/\s+$/, '') + '\n' + yaml.dump(existing, { lineWidth: 200, noRefs: true })

console.log('patch file : ' + patchPath)
console.log('entries    : ' + staged.length + ' staged -> ' + added.length + ' added, ' + replaced.length + ' replaced')
for (const a of added) console.log('  + ' + a)
for (const r of replaced) console.log('  ~ ' + r)

if (has('--dry-run')) { console.log('\n--- result (dry run, nothing written) ---\n' + out); process.exit(0) }

const outPath = opt('--out', patchPath)
writeFileSync(outPath, out)
console.log('\nwrote ' + outPath + ' (' + out.length + ' bytes)')
