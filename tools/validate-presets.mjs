#!/usr/bin/env node
/**
 * validate-presets — check that every preset composition parses and that every
 * plugin row it names can actually be resolved, before a session tries to mount it.
 *
 *   node tools/validate-presets.mjs                 # $DSH_HOME/.agent-presets
 *   node tools/validate-presets.mjs <dir>           # a specific root
 *
 * Exits non-zero if any preset fails to parse or names an unresolvable module.
 *
 * Note on !!js gates: platform switches such as \`!!js process.platform === 'win32'\`
 * are evaluated by the loader at mount time, not here. A row whose gate would be
 * false on this platform is reported as DECLARED-enabled.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { dshHome, dshApp, yamlWithJsTag } from './lib-yaml.mjs'

const { yaml, schema: SCHEMA } = yamlWithJsTag()

// A missing argument used to crash with "path must be of type string", which told
// the reader nothing. Default to the user preset root and say so.
const root = process.argv[2] ?? join(dshHome(), '.agent-presets')
if (!existsSync(root)) {
  console.error('preset root not found: ' + root)
  console.error('  pass a directory, or set DSH_HOME (currently ' +
    (process.env.DSH_HOME ? "'" + process.env.DSH_HOME + "'" : 'unset') + ')')
  process.exit(2)
}

// Derived, never hardcoded: the node_modules roots a preset row could resolve from.
const searchDirs = [
  join(dshHome(), 'profiles', 'web', 'node_modules'),
  join(dshHome(), 'profiles', 'node_modules'),
  join(dshApp(), 'node_modules'),
].filter(existsSync)

function resolvable(spec, presetDir) {
  if (spec.startsWith('cordis:')) return 'builtin'
  // A preset resolves './x.mjs' against its own directory, so a preset that mounts
  // a local plugin must carry that plugin next to agent.cordis.yml.
  if (spec.startsWith('.')) return presetDir && existsSync(join(presetDir, spec)) ? 'ok' : 'MISSING'
  if (spec.startsWith('/')) return existsSync(spec) ? 'ok' : 'MISSING'
  const parts = spec.split('/')
  const pkg = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  for (const d of searchDirs) if (existsSync(join(d, pkg))) return 'ok'
  return 'MISSING'
}

function flatten(rows, out = [], off = false) {
  for (const row of rows ?? []) {
    const d = off || row.disabled === true
    out.push({ id: row.id, name: row.name, disabled: d, group: row.group === true })
    if (Array.isArray(row.config)) flatten(row.config, out, d)
  }
  return out
}

let failures = 0
const dirs = readdirSync(root)
if (!dirs.length) { console.error('preset root is empty: ' + root); process.exit(2) }

for (const dir of dirs) {
  const f = join(root, dir, 'agent.cordis.yml')
  if (!existsSync(f)) continue
  let rows
  try { rows = yaml.load(readFileSync(f, 'utf8'), { schema: SCHEMA }) }
  catch (e) { console.log('YAML FAIL ' + dir + ': ' + e.message.split('\n')[0]); failures++; continue }
  if (!Array.isArray(rows)) { console.log('NOT A LIST ' + dir); failures++; continue }

  const flat = flatten(rows)
  const enabled = flat.filter((r) => !r.disabled && !r.group)
  const missing = enabled.map((r) => [r.id, r.name, resolvable(r.name, join(root, dir))])
    .filter((x) => x[2] === 'MISSING')
  let meta = {}
  try { meta = yaml.load(readFileSync(join(root, dir, 'preset.yml'), 'utf8'), { schema: SCHEMA }) ?? {} } catch {}

  console.log(
    dir.padEnd(14),
    'rows=' + String(flat.length).padStart(3),
    'enabled=' + String(enabled.length).padStart(3),
    'off=' + String(flat.length - enabled.length).padStart(3),
    '| ' + String(meta.name ?? '(no preset.yml)').padEnd(20) + ' order=' + (meta.order ?? '?') +
    (missing.length ? '  ** MISSING ' + JSON.stringify(missing) : '  (all modules resolve)')
  )
  if (missing.length) failures++
}

process.exit(failures ? 1 : 0)
