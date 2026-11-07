#!/usr/bin/env node
/**
 * snapshot-state â€” capture the DSH-side state next to the workspace, so a
 * baseline can be restored and two versions can be diffed.
 *
 * The workspace is only half the experiment: the presets live in $DSH_HOME and
 * the host tuning lives in the profile patch file. Neither is inside the repo.
 * This copies both, plus versions and content hashes, into snapshots/<label>/.
 *
 *   node tools/snapshot-state.mjs --label v0-baseline
 *   node tools/snapshot-state.mjs --label v1-router --diff v0-baseline
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, cpSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const home = process.env.DSH_HOME || join(process.env.USERPROFILE ?? '', '.dsh')
const app = process.env.DSH_APP ?? join(process.env.USERPROFILE ?? '', 'dsh-app')

const label = opt('--label', null)
const diffAgainst = opt('--diff', null)
if (!label) { console.error('need --label <name>'); process.exit(2) }

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16)
const snapDir = join(repo, 'snapshots', label)

function collect() {
  const files = {}
  const add = (rel, abs) => { if (existsSync(abs)) files[rel] = { sha256: sha(abs), bytes: statSync(abs).size } }

  // agent presets (shipped ones are recorded by hash only; user ones are copied)
  const userRoot = join(home, '.agent-presets')
  if (existsSync(userRoot)) {
    for (const d of readdirSync(userRoot)) {
      const dir = join(userRoot, d)
      // Hash EVERY file, not just the composition. A preset that mounts a local
      // plugin carries that plugin's source next to agent.cordis.yml, and a change
      // there changes behaviour. Hashing only agent.cordis.yml would make the diff
      // silently miss it and leave "which version produced this result"
      // unanswerable.
      for (const f of readdirSync(dir)) {
        if (statSync(join(dir, f)).isFile()) add(join('agent-presets', d, f), join(dir, f))
      }
    }
  }
  // host-plane state
  add(join('profile', 'cordis.patch.yml'), join(home, 'profiles', 'web', 'cordis.patch.yml'))
  add(join('profile', 'package.json'), join(home, 'profiles', 'web', 'package.json'))
  add('dsh-settings.yaml', join(home, 'settings.yaml'))
  return files
}

const files = collect()

// version facts worth pinning in a paper
let dshVersion = null
try { dshVersion = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).dependencies?.['@deepseek-ai/dsh'] ?? null } catch {}
let gitHead = null
try { gitHead = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch {}

const manifest = {
  label,
  createdAt: new Date().toISOString(),
  dshVersion,
  node: process.version,
  platform: process.platform,
  workspaceGitHead: gitHead,
  dshHome: home,
  files,
}

if (!diffAgainst) {
  mkdirSync(snapDir, { recursive: true })
  const userRoot = join(home, '.agent-presets')
  if (existsSync(userRoot)) cpSync(userRoot, join(snapDir, 'agent-presets'), { recursive: true })
  const profDir = join(snapDir, 'profile')
  mkdirSync(profDir, { recursive: true })
  for (const [rel, abs] of [['cordis.patch.yml', join(home, 'profiles', 'web', 'cordis.patch.yml')],
                            ['package.json', join(home, 'profiles', 'web', 'package.json')]]) {
    if (existsSync(abs)) writeFileSync(join(profDir, rel), readFileSync(abs))
  }
  if (existsSync(join(home, 'settings.yaml'))) writeFileSync(join(snapDir, 'dsh-settings.yaml'), readFileSync(join(home, 'settings.yaml')))
  writeFileSync(join(snapDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n')
  console.log('snapshot written: snapshots/' + label)
  console.log('  dsh ' + dshVersion + '  node ' + process.version + '  git ' + (gitHead ? gitHead.slice(0, 8) : 'none'))
  console.log('  tracked files: ' + Object.keys(files).length)
  for (const [rel, f] of Object.entries(files)) console.log('    ' + f.sha256 + '  ' + String(f.bytes).padStart(7) + '  ' + rel)
  process.exit(0)
}

// diff mode: compare live state against a recorded snapshot
const baseManifest = JSON.parse(readFileSync(join(repo, 'snapshots', diffAgainst, 'manifest.json'), 'utf8'))
const base = baseManifest.files
const all = [...new Set([...Object.keys(base), ...Object.keys(files)])].sort()
let changed = 0
console.log('DIFF  live state vs snapshots/' + diffAgainst)
for (const rel of all) {
  const a = base[rel], b = files[rel]
  if (!a) { console.log('  + added    ' + rel); changed++; continue }
  if (!b) { console.log('  - removed  ' + rel); changed++; continue }
  if (a.sha256 !== b.sha256) { console.log('  ~ changed  ' + rel + '   ' + a.sha256 + ' -> ' + b.sha256); changed++ }
}
if (baseManifest.dshVersion !== dshVersion) { console.log('  ! dsh version ' + baseManifest.dshVersion + ' -> ' + dshVersion); changed++ }
console.log(changed ? '\n' + changed + ' difference(s)' : '\nno differences')

