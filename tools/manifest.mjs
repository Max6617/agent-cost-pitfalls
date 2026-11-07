#!/usr/bin/env node
/**
 * manifest — capture everything a reader would need to reproduce a matrix exactly.
 *
 * Harness versions alone are not enough. DSH is a composition of ~250 packages and
 * which ones are ENABLED, at which versions, is part of the experimental condition:
 * dsh:native and dsh:ptc differ precisely in which plugins are active. Reporting
 * "DSH 0.1.7-rc.2" and stopping there would not let anyone rebuild the arms.
 *
 *   node tools/manifest.mjs            # print
 *   node tools/manifest.mjs --write    # write results/manifest.json
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dshHome, dshApp } from './lib-yaml.mjs'

const repo = resolve('.')
const sha = (t) => createHash('sha256').update(t).digest('hex').slice(0, 16)
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }

const m = { capturedAt: new Date().toISOString(), host: {}, toolchain: {}, harnesses: {}, dsh: {}, models: {}, suite: {}, conditions: {} }

// ---- host ---------------------------------------------------------------------
m.host = {
  platform: process.platform,
  arch: process.arch,
  cpus: (await import('node:os')).cpus().length,
  cpuModel: (await import('node:os')).cpus()[0]?.model,
  totalMemGB: Math.round((await import('node:os')).totalmem() / 1e9 * 10) / 10,
}

// ---- toolchain ------------------------------------------------------------------
m.toolchain.node = process.version
const v = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', shell: true }); return (r.stdout ?? '').trim().split('\n')[0] || null }
m.toolchain.python = v('python', ['--version'])

// ---- harnesses ------------------------------------------------------------------
m.harnesses.dsh = { version: v(join(dshApp(), 'node_modules/.bin/dsh.cmd'), ['--version']) }
m.harnesses.opencode = { version: v('opencode', ['--version']) }
m.harnesses.aider = { version: v('aider', ['--version']) }
m.harnesses.cline = { version: v('cline', ['--version']) }

// ---- DSH composition: the packages ARE the experimental condition -----------------
const profileScope = join(dshHome(), 'profiles', 'node_modules', '@deepseek-ai')
const installed = {}
if (existsSync(profileScope)) {
  for (const name of readdirSync(profileScope)) {
    const pkg = readJson(join(profileScope, name, 'package.json'))
    if (pkg?.version) installed[name] = pkg.version
  }
}
m.dsh.installedPackages = Object.keys(installed).length
m.dsh.packages = Object.fromEntries(Object.entries(installed).sort())

// The composed config for each arm's profile+patch is the exact runtime condition.
const condDir = join(repo, 'conditions')
for (const f of existsSync(condDir) ? readdirSync(condDir) : []) {
  if (!/\.ya?ml$/.test(f)) continue
  const p = join(condDir, f)
  m.conditions[f] = { sha256_16: sha(readFileSync(p, 'utf8')), bytes: statSync(p).size }
}
for (const profile of ['exp', 'web']) {
  const args = ['--profile', profile, '--dump-config']
  for (const c of ['shipped.yml', 'optimized.yml']) {
    if (existsSync(join(condDir, c))) args.push('--patch', join(condDir, c))
    const r = spawnSync(join(dshApp(), 'node_modules/.bin/dsh.cmd'), args, { encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 })
    if (r.status === 0 && r.stdout) {
      const key = profile + (c === 'shipped.yml' ? '' : '+' + c)
      m.dsh.composed = m.dsh.composed ?? {}
      m.dsh.composed[key] = { sha256_16: sha(r.stdout), lines: r.stdout.split('\n').length }
    }
    if (c === 'shipped.yml') args.length = 3
  }
}

// ---- models ---------------------------------------------------------------------
// Provider-side snapshot ids where the API exposes them; otherwise the requested id.
m.models = {
  requested: ['deepseek-flash', 'glm-5.3-flash', 'glm-5.3'],
  note: 'Requested model ids. Provider snapshots are recorded per-request in the gateway log ' +
        '(field "model" as returned upstream), which is the authoritative record.',
}

// ---- task suite ------------------------------------------------------------------
const taskDir = join(repo, 'tasks')
const tasks = existsSync(taskDir) ? readdirSync(taskDir).filter((d) => existsSync(join(taskDir, d, 'task.json'))) : []
const perTask = {}
for (const t of tasks) {
  const h = createHash('sha256')
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else { h.update(p.slice(join(taskDir, t).length)); h.update(readFileSync(p)) }
    }
  }
  walk(join(taskDir, t))
  perTask[t] = h.digest('hex').slice(0, 16)
}
m.suite = { tasks: tasks.length, perTaskSha: perTask }

// ---- repo ------------------------------------------------------------------------
m.repo = { gitHead: v('git', ['rev-parse', 'HEAD']), dirty: (v('git', ['status', '--porcelain']) ?? '').length > 0 }

if (process.argv.includes('--write')) {
  mkdirSync(join(repo, 'results'), { recursive: true })
  const out = join(repo, 'results', 'manifest.json')
  writeFileSync(out, JSON.stringify(m, null, 2))
  console.log('written: ' + out)
} else {
  console.log('HOST      ' + m.host.cpuModel + '  ' + m.host.cpus + ' cpus  ' + m.host.totalMemGB + ' GB  ' + m.host.platform)
  console.log('NODE      ' + m.toolchain.node + '    python ' + m.toolchain.python)
  console.log('')
  console.log('HARNESSES')
  for (const [k, x] of Object.entries(m.harnesses)) console.log('  ' + k.padEnd(10) + (x.version ?? '(not found)'))
  console.log('')
  console.log('DSH COMPOSITION   ' + m.dsh.installedPackages + ' packages installed')
  for (const [k, x] of Object.entries(m.dsh.composed ?? {})) console.log('  ' + k.padEnd(22) + 'sha ' + x.sha256_16 + '  ' + x.lines + ' lines')
  console.log('')
  console.log('CONDITIONS')
  for (const [k, x] of Object.entries(m.conditions)) console.log('  ' + k.padEnd(22) + 'sha ' + x.sha256_16)
  console.log('')
  console.log('SUITE     ' + m.suite.tasks + ' tasks')
  console.log('REPO      ' + m.repo.gitHead + (m.repo.dirty ? '  (DIRTY)' : ''))
  console.log('')
  console.log('run with --write to save results/manifest.json')
}
