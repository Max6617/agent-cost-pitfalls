#!/usr/bin/env node
/**
 * preset-catalog — show what each agent preset actually enables.
 *
 * Prints a comparison table of enabled plugin rows per preset, so a mode's real
 * tool catalog is inspectable without starting a session. Reads the shipped
 * presets from the DSH install and any user presets under $DSH_HOME/.agent-presets.
 *
 * Note: !!js disabled-gates (platform switches) are shown as DECLARED-enabled;
 * they are evaluated by the loader at mount time, not here.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { dshHome, yamlWithJsTag } from './lib-yaml.mjs'

const { yaml, schema: SCHEMA } = yamlWithJsTag()

function flatten(rows, out = [], off = false) {
  for (const row of rows ?? []) {
    const d = off || row.disabled === true
    out.push({ id: row.id, disabled: d, group: row.group === true })
    if (Array.isArray(row.config)) flatten(row.config, out, d)
  }
  return out
}

const home = dshHome()
const shipped = process.argv[2]
const userRoot = join(home, '.agent-presets')

const sources = []
if (shipped && existsSync(shipped)) for (const d of readdirSync(shipped)) sources.push([d, join(shipped, d)])
if (existsSync(userRoot)) for (const d of readdirSync(userRoot)) sources.push([d, join(userRoot, d)])

const catalogs = {}
const meta = {}
for (const [id, dir] of sources) {
  const f = join(dir, 'agent.cordis.yml')
  if (!existsSync(f)) continue
  const rows = yaml.load(readFileSync(f, 'utf8'), { schema: SCHEMA })
  catalogs[id] = flatten(rows).filter(r => !r.disabled && !r.group).map(r => r.id)
  try { meta[id] = yaml.load(readFileSync(join(dir, 'preset.yml'), 'utf8'), { schema: SCHEMA }) ?? {} } catch { meta[id] = {} }
}

const ids = Object.keys(catalogs)
const all = [...new Set(Object.values(catalogs).flat())].sort()
const W = Math.max(...ids.map(i => i.length)) + 1
const COL = Math.max(...ids.map(i => (meta[i].name ?? i).length)) + 2

console.log('\nENABLED PLUGIN ROWS PER PRESET\n')
console.log('row'.padEnd(30) + ids.map(i => (meta[i].name ?? i).slice(0, COL - 1).padStart(COL)).join(''))
console.log('-'.repeat(30 + ids.length * COL))
for (const row of all) {
  console.log(row.padEnd(30) + ids.map(i => (catalogs[i].includes(row) ? 'yes' : '-').padStart(COL)).join(''))
}
console.log('-'.repeat(30 + ids.length * COL))
console.log('TOTAL'.padEnd(30) + ids.map(i => String(catalogs[i].length).padStart(COL)).join(''))
console.log('\norder: ' + ids.map(i => i + '=' + (meta[i].order ?? '?')).join('  '))
