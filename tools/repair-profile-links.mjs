/**
 * repair-profile-links — re-point the DSH profile's junction farm after an upgrade.
 *
 * WHAT THIS IS
 *   ~/.dsh/profiles/node_modules/@deepseek-ai/ holds ~242 junctions, one per
 *   package, each pointing into the CLI's pnpm store:
 *
 *     @deepseek-ai/dsh-base
 *       -> dsh-app/node_modules/.pnpm/@deepseek-ai+dsh@0.1.5-alph_<hash>/node_modules/@deepseek-ai/dsh-base
 *
 *   That path is keyed by the CLI version. "pnpm add @deepseek-ai/dsh@X" deletes
 *   the old store directory, so every junction into it dangles at once. The
 *   symptom is not an obvious breakage: DSH still boots, because it resolves its
 *   bundles from the CLI install. What breaks is anything resolving PLUGIN module
 *   names through the profile, which is how preset validation works - so
 *   tools/validate-presets.mjs reported all 22 rows of every preset as MISSING.
 *
 * WHY NAME MATCHING DOES NOT WORK
 *   pnpm 10+ shortens long store directory names, so the package is not findable
 *   by searching for its name:
 *     @deepseek-ai+dsh-code-runti_d969c601eb47bc15cf4ade2f06d16e8c
 *   This walks the store instead and resolves each package to a real path.
 *
 *   node tools/repair-profile-links.mjs --dry-run
 *   node tools/repair-profile-links.mjs
 */
import { readdirSync, existsSync, readFileSync, statSync, lstatSync, symlinkSync, writeFileSync } from 'node:fs'
import { safeUnlinkLink } from './safe-fs.mjs'
import { join } from 'node:path'
import { dshHome, dshApp } from './lib-yaml.mjs'

const dryRun = process.argv.includes('--dry-run')
const profiles = join(dshHome(), 'profiles')
const scopeDir = join(profiles, 'node_modules', '@deepseek-ai')
const store = join(dshApp(), 'node_modules', '.pnpm')

if (!existsSync(scopeDir)) { console.error('no profile scope dir at ' + scopeDir); process.exit(2) }
if (!existsSync(store)) { console.error('no pnpm store at ' + store); process.exit(2) }

// ---- index every @deepseek-ai package that exists anywhere in the store -------
// store layout: <store>/<dir>/node_modules/@deepseek-ai/<name>/package.json
const found = new Map() // name -> [{ path, version }]
for (const dir of readdirSync(store)) {
  const inner = join(store, dir, 'node_modules', '@deepseek-ai')
  if (!existsSync(inner)) continue
  for (const name of readdirSync(inner)) {
    const pkg = join(inner, name, 'package.json')
    if (!existsSync(pkg)) continue
    let version = '0.0.0'
    try { version = JSON.parse(readFileSync(pkg, 'utf8')).version ?? '0.0.0' } catch {}
    if (!found.has(name)) found.set(name, [])
    found.get(name).push({ path: join(inner, name), version })
  }
}
console.log('store index: ' + found.size + ' distinct @deepseek-ai packages across ' + readdirSync(store).length + ' store dirs')

/** Pick the highest version, so a repair never downgrades. */
function pick(name) {
  const c = found.get(name)
  if (!c?.length) return null
  return c.slice().sort((a, b) => {
    const pa = a.version.split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1))
    const pb = b.version.split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : -1))
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] ?? -1) - (pb[i] ?? -1)
      if (d) return d
    }
    return a.version.localeCompare(b.version)
  }).pop()
}

// ---- walk the junctions -------------------------------------------------------
const entries = readdirSync(scopeDir)
const dangling = []
let live = 0
for (const name of entries) {
  const p = join(scopeDir, name)
  const ok = existsSync(join(p, 'package.json'))
  if (ok) live++
  else dangling.push({ name, path: p, isLink: lstatSync(p).isSymbolicLink() || !!statSync(p).isDirectory() })
}

console.log('junctions: ' + entries.length + '   live: ' + live + '   dangling: ' + dangling.length)
if (!dangling.length) { console.log('nothing to repair'); process.exit(0) }

const plan = []
const unfixable = []
for (const d of dangling) {
  const t = pick(d.name)
  if (t) plan.push({ ...d, target: t.path, version: t.version })
  else unfixable.push(d.name)
}

console.log('')
console.log('repairable : ' + plan.length)
for (const p of plan.slice(0, 8)) console.log('  ' + p.name.padEnd(38) + '-> v' + p.version)
if (plan.length > 8) console.log('  ... and ' + (plan.length - 8) + ' more')
if (unfixable.length) {
  console.log('')
  console.log('not in the store at all (' + unfixable.length + ') - left alone:')
  for (const n of unfixable) console.log('  ' + n)
}

if (dryRun) { console.log('\nDRY RUN - nothing changed'); process.exit(0) }

// Record the prior state so a repair can be audited or undone by hand.
const backup = join(profiles, '.junction-backup-' + Date.now() + '.json')
writeFileSync(backup, JSON.stringify(dangling.map((d) => ({ name: d.name, was: (() => { try { return lstatSync(d.path).isSymbolicLink() ? null : null } catch { return null } })() })), null, 2))

let fixed = 0, failed = 0
for (const p of plan) {
  try {
    // safeUnlinkLink, not safeClean: every entry in the plan is a dangling JUNCTION, and
    // removing a link destroys no data. It refuses anything that is not a link, so a bug in
    // the planner cannot turn this into a recursive delete of a real directory.
    safeUnlinkLink(p.path)
    symlinkSync(p.target, p.path, 'junction')
    fixed++
  } catch (e) {
    failed++
    console.log('  FAILED ' + p.name + ': ' + e.message)
  }
}
console.log('')
console.log('repaired: ' + fixed + (failed ? '   failed: ' + failed : ''))
console.log('backup of the dangling list: ' + backup)

// ---- add junctions for packages the farm never had ----------------------------
// Repairing dangling links is only half the job. The farm mirrors the CLI's
// dependency closure, and a new CLI version also ADDS packages - 0.1.7 introduces
// dsh-workflow-ptc and dsh-tool-workflow, which have no junction at all because
// 0.1.5 did not have them. validate-presets.mjs then reports them MISSING even
// though they are installed, because it resolves plugin names through this farm.
const cliPkg = JSON.parse(readFileSync(join(dshApp(), 'package.json'), 'utf8'))
const cliVersion = cliPkg.dependencies?.['@deepseek-ai/dsh'] ?? ''
const candidates = readdirSync(store).filter((d) => d.startsWith('@deepseek-ai+dsh@' + cliVersion + '_'))
if (candidates.length !== 1) {
  console.log('')
  console.log('could not identify the CLI closure (' + candidates.length + ' matches) - skipping add-missing')
  process.exit(0)
}
const closureDir = join(store, candidates[0], 'node_modules', '@deepseek-ai')
const closure = existsSync(closureDir) ? readdirSync(closureDir) : []
const have = new Set(readdirSync(scopeDir))
const toAdd = closure.filter((n) => !have.has(n))

console.log('')
console.log('CLI closure ' + cliVersion + ': ' + closure.length + ' packages, ' + toAdd.length + ' with no junction')
let added = 0
for (const name of toAdd) {
  const target = join(closureDir, name)
  if (!existsSync(join(target, 'package.json'))) continue
  try {
    symlinkSync(target, join(scopeDir, name), 'junction')
    added++
  } catch (e) { console.log('  FAILED to add ' + name + ': ' + e.message) }
}
console.log('added: ' + added)
console.log('')
console.log('verify: node tools/validate-presets.mjs')
