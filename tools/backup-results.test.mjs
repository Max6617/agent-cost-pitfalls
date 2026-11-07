/**
 * backup-results.test.mjs - the backup must survive the thing that actually happened.
 *
 * The disaster was not "the disk died". It was ONE rmSync on results/ with results/ untracked.
 * So the property that matters is not "a backup exists" but:
 *
 *   DELETING A FILE FROM THE SOURCE MUST NOT REMOVE IT FROM THE BACKUP.
 *
 * That is the first test below, and it is the one that would have saved the study. The rest
 * pin the details: the backup root must be OUTSIDE the working tree, the mirror must be
 * incremental (a second run must not re-copy unchanged bytes), and --verify must actually
 * notice a missing file instead of printing OK.
 *
 * Run: node --test tools/backup-results.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, statSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const tool = join(here, 'backup-results.mjs')
const root = join(tmpdir(), 'dsh-exp-backup-test-' + Date.now().toString(36))

function fixture () {
  const src = join(root, 'results')
  mkdirSync(join(src, 'ds-full'), { recursive: true })
  mkdirSync(join(src, '_scratch'), { recursive: true })
  writeFileSync(join(src, 'ds-full', 'runs.jsonl'), '{"task":"a"}\n{"task":"b"}\n')
  writeFileSync(join(src, 'ds-full', 'gateway.jsonl'), '{"status":200}\n')
  writeFileSync(join(src, 'runs.jsonl'), '{"task":"c"}\n')
  return src
}
function run (args) {
  const r = spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8', cwd: repo, timeout: 120000 })
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }
}

/** The real backup root, the one collect.mjs signs a matrix off against. */
const DEFAULT_TARGET = resolve(repo, '..', 'betterharness-backups')

/**
 * A cheap, exact fingerprint of a backup root. Every write to a root appends a line to
 * log.jsonl and rewrites manifest.json, in that order and unconditionally, so those two files
 * are a complete witness to "was this root touched at all". Walking the whole tree instead
 * would drag in a legacy _scratch mirror (the browser profile the backup used to copy) and
 * take seconds per call.
 */
function targetFingerprint (root) {
  if (!existsSync(root)) return '(absent)'
  let log = -1, manifest = '(none)'
  try { log = statSync(join(root, 'log.jsonl')).size } catch {}
  try { manifest = readFileSync(join(root, 'manifest.json'), 'utf8') } catch {}
  return log + '|' + manifest
}

test('a file deleted from the source is still in the backup', () => {
  const src = fixture()
  const dst = join(root, 'backup')
  const a = run(['--from', src, '--to', dst, '--quiet'])
  assert.equal(a.status, 0, 'first backup must succeed: ' + a.out)
  assert.ok(existsSync(join(dst, 'mirror', 'ds-full', 'runs.jsonl')), 'records must be mirrored')

  // THIS IS THE TEST. rmSync the source subtree, exactly as preflight.mjs did.
  rmSync(join(src, 'ds-full'), { recursive: true, force: true })
  assert.equal(existsSync(join(src, 'ds-full', 'runs.jsonl')), false, 'the source really is gone')

  assert.equal(readFileSync(join(dst, 'mirror', 'ds-full', 'runs.jsonl'), 'utf8'), '{"task":"a"}\n{"task":"b"}\n',
    'the backup copy must still hold the records')

  const b = run(['--from', src, '--to', dst, '--quiet'])
  assert.equal(b.status, 0, b.out)
  assert.ok(existsSync(join(dst, 'mirror', 'ds-full', 'runs.jsonl')),
    'a later incremental backup must NOT delete what the source no longer has')
})

test('the backup root may not live inside the working tree', () => {
  const src = fixture()
  const bad = run(['--from', src, '--to', join(repo, 'results', '_scratch', 'backup-here'), '--quiet'])
  assert.notEqual(bad.status, 0, 'a backup inside the repo is not a backup')
  assert.match(bad.out, /outside|refus/i)
})

test('an incremental run does not re-copy unchanged files', () => {
  const src = fixture()
  const dst = join(root, 'backup2')
  run(['--from', src, '--to', dst, '--quiet'])
  const manifest = JSON.parse(readFileSync(join(dst, 'manifest.json'), 'utf8'))
  const before = statSync(join(dst, 'mirror', 'ds-full', 'runs.jsonl')).mtimeMs
  // One file changes; the others must be left alone.
  writeFileSync(join(src, 'runs.jsonl'), '{"task":"c"}\n{"task":"d"}\n')
  const r = run(['--from', src, '--to', dst, '--quiet'])
  assert.equal(r.status, 0, r.out)
  assert.equal(statSync(join(dst, 'mirror', 'ds-full', 'runs.jsonl')).mtimeMs, before,
    'an unchanged file must not be rewritten')
  assert.equal(readFileSync(join(dst, 'mirror', 'runs.jsonl'), 'utf8'), '{"task":"c"}\n{"task":"d"}\n',
    'the changed file must be refreshed')
  assert.ok(manifest.files > 0)
})

test('--verify fails when the backup is missing something the source has', () => {
  const src = fixture()
  const dst = join(root, 'backup3')
  run(['--from', src, '--to', dst, '--quiet'])
  assert.equal(run(['--from', src, '--to', dst, '--verify']).status, 0, 'verify passes right after a backup')
  // Remove a file from the BACKUP only; verify must notice.
  rmSync(join(dst, 'mirror', 'runs.jsonl'), { force: true })
  const v = run(['--from', src, '--to', dst, '--verify'])
  assert.notEqual(v.status, 0, 'verify must fail when the backup is incomplete')
  assert.match(v.out, /missing|MISSING/i)
})

test('--snapshot keeps a point-in-time copy that a later source change cannot touch', () => {
  const src = fixture()
  const dst = join(root, 'backup4')
  const s = run(['--from', src, '--to', dst, '--snapshot', 'mmu123 620 runs', '--quiet'])
  assert.equal(s.status, 0, s.out)
  const snaps = execFileSync(process.execPath, ['-e', 'const {readdirSync}=require("fs");console.log(readdirSync(process.argv[1]).join(","))', join(dst, 'snapshots')], { encoding: 'utf8' }).trim().split(',')
  assert.equal(snaps.length, 1)
  const snapDir = join(dst, 'snapshots', snaps[0])
  assert.ok(existsSync(join(snapDir, 'ds-full', 'runs.jsonl')), 'the snapshot must hold the tree as it was')
  assert.match(snaps[0], /mmu123/, 'the label must be recoverable from the snapshot name')
  // Overwrite the source; the snapshot must not move.
  writeFileSync(join(src, 'ds-full', 'runs.jsonl'), 'REPLACED\n')
  assert.equal(readFileSync(join(snapDir, 'ds-full', 'runs.jsonl'), 'utf8'), '{"task":"a"}\n{"task":"b"}\n')
})

test('a backup that cannot write says so and exits non-zero', () => {
  const src = fixture()
  // A path that cannot be created on Windows: a file used as a directory.
  const blocker = join(root, 'blocker-file')
  writeFileSync(blocker, 'x')
  const r = run(['--from', src, '--to', join(blocker, 'nested'), '--quiet'])
  assert.notEqual(r.status, 0, 'a failed backup must not exit 0: ' + r.out)
})

/**
 * THE BUG THIS TEST EXISTS FOR, found 2026-10-02 while starting the GLM matrix.
 *
 * --to was ADDITIVE: targets = [--to] + defaults. So every run of THIS FILE - the suite whose
 * whole job is to protect the archive - also mirrored its 3 tiny fixture files into the real
 * backup root at ../betterharness-backups. Consequences, all observed in the live root:
 *
 *   - mirror/ds-full/runs.jsonl went from 3,194,918 bytes of real DeepSeek records to 26 bytes
 *     of '{"task":"a"}' fixture, and mirror/runs.jsonl to 13 bytes;
 *   - manifest.json was rewritten to claim its source was %TEMP%\dsh-exp-backup-test-*\results;
 *   - seven snapshots named "mmu123 620 runs" were left in snapshots/, each holding 54 bytes
 *     of fixture and looking exactly like a point-in-time copy of a 620-run matrix.
 *
 * Every assertion in this file still passed. The backup of the evidence was being overwritten
 * by the test that proves the backup works, silently, on every test run.
 *
 * So: an explicit --to must mean that target and NOTHING ELSE.
 */
test('an explicit --to is the ONLY target: the default backup root is not touched', () => {
  const before = targetFingerprint(DEFAULT_TARGET)
  const src = fixture()
  const dst = join(root, 'backup-exclusive')
  const r = run(['--from', src, '--to', dst, '--quiet'])
  assert.equal(r.status, 0, r.out)
  assert.ok(existsSync(join(dst, 'mirror', 'ds-full', 'runs.jsonl')),
    'the explicitly named target must receive the backup')
  assert.equal(targetFingerprint(DEFAULT_TARGET), before,
    'the default backup root changed during a backup that named a different --to.\n' +
    '  --to is additive, so the real archive is being written by test fixtures.\n' +
    '  Pass --also-defaults if you genuinely want both.')
})

test('a mirror refuses to be given two different sources', () => {
  // Mixing sources in one mirror is how a fixture source came to own the real manifest.
  const dst = join(root, 'backup-one-source')
  const a = fixture()
  assert.equal(run(['--from', a, '--to', dst, '--quiet']).status, 0)
  const other = join(root, 'a-second-source', 'results')
  mkdirSync(other, { recursive: true })
  writeFileSync(join(other, 'runs.jsonl'), '{"task":"z"}\n')
  const r = run(['--from', other, '--to', dst, '--quiet'])
  assert.notEqual(r.status, 0, 'a second source into the same mirror must be refused: ' + r.out)
  assert.match(r.out, /source/i)
  assert.equal(readFileSync(join(dst, 'mirror', 'runs.jsonl'), 'utf8'), '{"task":"c"}\n',
    'the refused run must not have written anything')
})
