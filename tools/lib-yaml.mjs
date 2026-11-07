/**
 * lib-yaml — shared path resolution and YAML loading for the tools.
 *
 * Extracted because two tools had hardcoded absolute paths of the form
 * C:/Users/<name>/dsh-app/node_modules/.pnpm/js-yaml@4.3.2/... which pinned both
 * the user and the dependency version. A replication package that only runs on
 * the machine that wrote it is not a replication package.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const profile = () => process.env.USERPROFILE || process.env.HOME || ''

/** $DSH_HOME, or the conventional default. Use || not ??: an empty string must fall back too. */
export const dshHome = () => process.env.DSH_HOME || join(profile(), '.dsh')

/** Where the dsh CLI is installed. */
export const dshApp = () => process.env.DSH_APP || join(profile(), 'dsh-app')

/**
 * A runnable path to the dsh CLI.
 *
 * The CLI is installed into <dshApp>/node_modules/.bin but is frequently NOT on
 * PATH - a GUI launch or a shortcut does not put it there. spawnSync('dsh', ...)
 * then fails with "command not found", which reads as an experiment failure
 * rather than a PATH problem. Resolve the real file first, and fall back to the
 * bare name only if nothing is found.
 */
/**
 * The dsh entry SCRIPT, for spawning node directly.
 *
 * Spawning the .cmd shim means shell:true, and with shell:true Node concatenates
 * arguments with NO escaping. A prompt containing spaces and parentheses is then
 * split into several arguments - observed live:
 *
 *   --patch ...shipped.yml The function add() in src/calc.js returns the wrong...
 *   "in" kann syntaktisch an dieser Stelle nicht verarbeitet werden
 *
 * Spawning node + this file with shell:false removes cmd.exe from the path
 * entirely, so the prompt is passed as ONE argument whatever it contains.
 */
export function dshBinJs() {
  return join(dshApp(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

export function dshCli() {
  const bin = process.platform === 'win32' ? 'dsh.cmd' : 'dsh'
  const candidates = [
    join(dshApp(), 'node_modules', '.bin', bin),
    join(dshApp(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  ]
  for (const c of candidates) if (existsSync(c)) return c
  return 'dsh'
}

/**
 * Resolve js-yaml from whichever pnpm store is present, without pinning a version.
 * Scans for any js-yaml@* directory rather than naming one.
 */
export function loadYaml(explicit) {
  if (explicit) {
    const p = join(explicit, 'package.json')
    if (!existsSync(p)) throw new Error('--jsyaml path has no package.json: ' + explicit)
    return createRequire(p)('js-yaml')
  }
  const stores = [
    join(dshApp(), 'node_modules', '.pnpm'),
    join(dshHome(), 'profiles', 'node_modules', '.pnpm'),
  ]
  for (const store of stores) {
    if (!existsSync(store)) continue
    for (const entry of readdirSync(store)) {
      if (!entry.startsWith('js-yaml@')) continue
      const pkg = join(store, entry, 'node_modules', 'js-yaml')
      if (existsSync(join(pkg, 'package.json'))) return createRequire(join(pkg, 'package.json'))('js-yaml')
    }
  }
  throw new Error('js-yaml not found under ' + stores.join(' or ') +
    '. Set DSH_APP to your dsh install, or pass --jsyaml <dir>.')
}

/**
 * Which preset a session runs.
 *
 * Read this carefully, because getting it wrong silently mislabels sessions:
 * the CREATION header carries the starting preset as a TOP-LEVEL field on the
 * 'session' event (`agentPreset`), NOT under `data`. A mid-session SWITCH appends
 * a separate `agent-preset/selected` event. An earlier version of dsh-audit.mjs
 * looked only at `data.agentPreset` on both, so it reported '(unrecorded)' for
 * every session that did not switch - 336 of them - and would have mislabelled
 * the corpus study.
 *
 * The switch event wins when present, because it is newer.
 */
export function sessionPreset(events) {
  const header = (events ?? []).find((e) => e?.type === 'session')
  const sw = (events ?? []).find((e) => e?.type === 'agent-preset/selected')
  const startedAs = header?.agentPreset ?? header?.data?.agentPreset ?? null
  const switchedTo = sw?.data?.agentPreset ?? null
  return { preset: switchedTo ?? startedAs, startedAs, switched: switchedTo !== null && switchedTo !== startedAs }
}

/**
 * Credential-store helpers.
 *
 * Written after a real mistake: a masking regex required the field name at the
 * START of a line, the store indents its YAML, so the fallback branch printed a
 * live API key verbatim into a transcript.
 *
 * the lesson: masking is the wrong shape for a secret. The value should never
 * leave a function un-redacted, so listCredentialRefs() cannot return one at all,
 * and readCredentialRef() is the single explicit door.
 */
export function maskSecret(v) {
  if (!v) return '(unset)'
  const s = String(v)
  if (s.length <= 8) return '****'
  return s.slice(0, 3) + '...' + s.slice(-4) + '  (' + s.length + ' chars)'
}

/** Names and masked forms of the refs in the credential store. Never a value. */
export function listCredentialRefs(file) {
  const path = file ?? join(dshHome(), '.credentials.yaml')
  if (!existsSync(path)) return { path, found: false, refs: [] }
  const refs = []
  let inRefs = false
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (/^refs:\s*$/.test(line)) { inRefs = true; continue }
    if (inRefs && indent === 0) inRefs = false
    if (!inRefs) continue
    const m = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line)
    if (m) refs.push({ name: m[1], masked: maskSecret(m[2].trim()), present: !!m[2].trim() })
  }
  return { path, found: true, refs }
}

/** The only door to a value. Never log or print the result. */
export function readCredentialRef(name, file) {
  const path = file ?? join(dshHome(), '.credentials.yaml')
  if (!existsSync(path)) return null
  let inRefs = false
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()
    if (/^refs:\s*$/.test(line)) { inRefs = true; continue }
    if (inRefs && indent === 0 && line) inRefs = false
    if (!inRefs) continue
    const m = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line)
    if (m && m[1] === name) return m[2].trim() || null
  }
  return null
}

/** A loader for preset compositions, which use Cordis' !!js evaluation tag. */
export function yamlWithJsTag() {
  const yaml = loadYaml(process.argv.includes('--jsyaml')
    ? process.argv[process.argv.indexOf('--jsyaml') + 1]
    : undefined)
  const jsTag = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: (d) => (d ?? '') })
  return { yaml, schema: yaml.DEFAULT_SCHEMA.extend([jsTag]) }
}
