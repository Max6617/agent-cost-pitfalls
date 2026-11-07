/**
 * safe-fs.test.mjs - the test that would have saved the study.
 *
 * WHY THIS FILE EXISTS. On 2026-10-02 tools/preflight.mjs ran
 *   rmSync('results', { recursive: true, force: true })
 * on a verbatim --out and deleted 24 matrices, ~5,900 run records and ~102,000 gateway
 * records. results/ was gitignored, so git held nothing to restore from; rmSync does not
 * use the Recycle Bin; the disk is a TRIM-enabled NVMe. Zero run records were recovered.
 *
 * Three hostile reviews had each found 5+ defects in work its author believed was
 * finished, and not one of them was caught by a test, because there was no test. This is
 * the test. It is written to FAIL on the code as it was: before tools/safe-fs.mjs exists,
 * the very first assertion fails with ERR_MODULE_NOT_FOUND, which is the point - the
 * guard is asserted to exist before anything is allowed to delete anything again.
 *
 * Run: node --test tools/safe-fs.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { safeClean, safeRemove } from './safe-fs.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const scratch = join(repo, 'results', '_scratch')

// Every one of these must THROW. If any of them stops throwing, the archive is one typo
// away from a repeat of 2026-10-02.
const MUST_REFUSE = [
  ['results', 'the archive itself'],
  ['results/ds-full', 'a direct child of the archive'],
  ['results/runs.jsonl', 'the run-record file'],
  ['results/_scratch', 'a direct child of the archive, even though it is the scratch root'],
  ['.', 'the repo root'],
  ['_ev', 'the evidence directory'],
  ['data', 'the surviving milestone matrices'],
  ['analysis', 'the committed derived files'],
  ['tools', 'tracked source'],
  ['..', 'the parent of the repo'],
  [tmpdir(), 'the whole temp directory'],
  ['C:/', 'a drive root'],
]

test('safeClean refuses every path that could reach the archive', () => {
  for (const [p, why] of MUST_REFUSE) {
    assert.throws(() => safeClean(p), (e) => e && /refus/i.test(e.message),
      'safeClean(' + JSON.stringify(p) + ') must refuse: ' + why)
  }
})

test('safeRemove refuses the same paths', () => {
  for (const [p, why] of MUST_REFUSE) {
    assert.throws(() => safeRemove(p), (e) => e && /refus/i.test(e.message),
      'safeRemove(' + JSON.stringify(p) + ') must refuse: ' + why)
  }
})

test('safeClean succeeds on a throwaway directory inside a scratch root', () => {
  const x = join(scratch, 'x')
  mkdirSync(join(x, 'deeper'), { recursive: true })
  writeFileSync(join(x, 'deeper', 'note.txt'), 'scratch')
  assert.equal(existsSync(x), true)
  const n = safeClean(x)
  assert.equal(existsSync(x), false, 'the directory must actually be gone')
  assert.equal(n, 1, 'it must report how many files it removed, got ' + n)
})

test('safeClean succeeds on a run workdir under the OS temp root', () => {
  const d = join(tmpdir(), 'dsh-exp-safe-fs-test-' + Math.random().toString(36).slice(2, 8))
  mkdirSync(join(d, '.cline-config', 'data'), { recursive: true })
  writeFileSync(join(d, 'hello.txt'), 'hi')
  assert.equal(safeClean(d), 1, 'one file (hello.txt) beneath the workdir')
  assert.equal(existsSync(d), false)
})

test('safeClean succeeds on a _scratch directory anywhere in the repo', () => {
  const d = join(repo, 'tasks-hard', '_scratch', 'safe-fs-test', 'wd')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'x.txt'), 'x')
  assert.ok(safeClean(d) >= 1)
  assert.equal(existsSync(d), false)
})

// A directory that HOLDS evidence is not scratch, whichever root it sits under. This is
// the rule that makes "scratch root" safe to have at all.
test('safeClean refuses a scratch path that contains run records', () => {
  const d = join(scratch, 'holds-records')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'runs.jsonl'), '{"task":"x"}\n')
  assert.throws(() => safeClean(d), /refus/i)
  assert.equal(existsSync(join(d, 'runs.jsonl')), true, 'the record must still be there')
  assert.throws(() => safeRemove(join(d, 'runs.jsonl')), /refus/i)
  // tidy up only what is provably not a record
  writeFileSync(join(d, 'runs.jsonl'), '')
  assert.throws(() => safeClean(d), /refus/i, 'still refused even when empty')
})

test('safeClean refuses a scratch path that contains a task.json', () => {
  const d = join(scratch, 'holds-task')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'task.json'), '{}')
  assert.throws(() => safeClean(d), /refus/i)
  assert.equal(existsSync(join(d, 'task.json')), true)
})

test('safeClean refuses a scratch path that contains ANY .jsonl', () => {
  const d = join(scratch, 'holds-jsonl')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'gateway.jsonl'), '{}\n')
  assert.throws(() => safeClean(d), /refus/i)
  assert.equal(existsSync(join(d, 'gateway.jsonl')), true)
})

test('safeClean refuses a git-tracked directory inside a scratch root', () => {
  const d = join(scratch, 'tracked-probe')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'keep.txt'), 'tracked')
  const git = (a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' })
  try {
    git(['add', '-f', join('results', '_scratch', 'tracked-probe', 'keep.txt')])
    assert.throws(() => safeClean(d), /refus/i)
    assert.equal(existsSync(join(d, 'keep.txt')), true)
  } finally {
    try { git(['rm', '-q', '--cached', join('results', '_scratch', 'tracked-probe', 'keep.txt')]) } catch {}
  }
})

test('there is no override: extra options cannot widen the guard', () => {
  for (const opts of [{ force: true }, { recursive: true }, { allow: true }, { root: repo }, { unsafe: true }]) {
    assert.throws(() => safeClean('results', opts), /refus/i,
      'safeClean(results, ' + JSON.stringify(opts) + ') must still refuse')
  }
})

test('safeRemove refuses a key file and succeeds on a scratch file', () => {
  assert.throws(() => safeRemove('.keys.json'), /refus/i)
  const f = join(scratch, 'throwaway.txt')
  mkdirSync(scratch, { recursive: true })
  writeFileSync(f, 'x')
  safeRemove(f)
  assert.equal(existsSync(f), false)
})

// The rule the brief asks for in one line: delete rmSync from this repo's vocabulary.
// safe-fs.mjs is the only file allowed to call a destructive fs primitive, and this test
// is what keeps it that way.
test('no other file in the repo calls a destructive filesystem primitive', () => {
  // PowerShell counts too: scripts/harness.ps1 held a Remove-Item against a gateway log inside
  // results/. Env:/Variable: drives are not filesystem deletions and are allowed through.
  const BANNED = /\b(rmSync|rmdirSync|unlinkSync|fs\.rm|rmdir)\s*\(|Remove-Item\s+(?!Env:|Variable:|-Path\s+Env:|-Path\s+Variable:)/
  const ALLOWED = new Set([
    join(repo, 'tools', 'safe-fs.mjs'),          // the implementation
    join(repo, 'tools', 'safe-fs.test.mjs'),     // this file
    // THE ONE LEGITIMATE rmSync IN THE REPO, and it is here on purpose: the backup test has to
    // reproduce the actual disaster - delete the source tree - to prove the backup survives it.
    // It operates on a throwaway tree in %TEMP%, never on results/.
    join(repo, 'tools', 'backup-results.test.mjs'),
    // Likewise: "DELETING a test file is flagged - the cheapest way to make a suite pass" has to
    // actually delete one. It deletes from a throwaway fixture in %TEMP%, and the deletion is the
    // thing under test.
    join(repo, 'tools', 'fixture-guard.test.mjs'),
  ])
  const offenders = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      // Vendored third-party trees are not "this repo's vocabulary": .git objects, installed
      // packages, Python environments, and a browser's user-data-dir (Edge writes thousands of
      // its own .js files into one). The last of those is a leftover from an early version of
      // tools/credit-alert.mjs that put the profile in results/_scratch; it now lives in %TEMP%.
      // `.claude` holds agent tool state and git WORKTREES - complete second checkouts of this repo,
      // whose own copies of the allowed files are not in ALLOWED (it is keyed on this checkout's
      // paths). Scanning them reported safe-fs.mjs itself as an offender; each worktree runs this
      // test against its own tree.
      if (e.name === '.git' || e.name === 'node_modules' || e.name === '.venvs' || e.name === '.claude' ||
          e.name === 'credit-alert-profile' || e.name.startsWith('credit-alert-profile')) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!/\.(mjs|js|cjs|ts|ps1)$/.test(e.name)) continue
      if (ALLOWED.has(p)) continue
      let src
      try { src = readFileSync(p, 'utf8') } catch { continue }
      src.split('\n').forEach((line, i) => {
        // Comments and prose describing the disaster are not calls. Strip // line comments,
        // /* */ block bodies and PowerShell # comments before matching.
        const code = line
          .replace(/^\s*\/\/.*$/, '')
          .replace(/^\s*\*.*$/, '')
          .replace(/^\s*#.*$/, '')
          .replace(/\/\/.*$/, '')
        if (BANNED.test(code)) offenders.push(p.replace(repo + '\\', '') + ':' + (i + 1) + '  ' + line.trim())
      })
    }
  }
  walk(repo)
  assert.deepEqual(offenders, [],
    'these call sites must be converted to safeClean/safeRemove:\n' + offenders.join('\n'))
})
