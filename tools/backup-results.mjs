/**
 * backup-results.mjs - a copy of results/ that an rmSync of results/ cannot reach.
 *
 * THE PROPERTY THAT MATTERS. On 2026-10-02 results/ was removed by one delete call while it
 * was untracked. Nothing recovered it: no Recycle Bin entry, no shadow copy, no File History,
 * no cloud sync, nothing in git - git had never been told the directory existed. So this tool
 * is not trying to survive a dead disk. It is trying to survive THIS PROJECT, which deletes
 * its own outputs by accident.
 *
 * Consequences of that, all deliberate:
 *
 *   - The backup root must be OUTSIDE the working tree. A backup inside the repo is one
 *     `git clean`, one `rmSync(repo)` or one bad pathspec away from the same fate.
 *   - The backup is APPEND-ONLY. It never deletes a file and it never prunes a snapshot.
 *     Disk is cheap; the archive was not. There is no --prune flag and there will not be one.
 *   - It is INCREMENTAL, because a backup that takes ten minutes is a backup that does not
 *     run. Unchanged files are left alone, matched on size and mtime.
 *   - Mirror updates are written to a temp file and RENAMED into place, so a snapshot's
 *     hardlinks always point at the bytes that were current when it was taken.
 *   - A failed backup exits non-zero. "Backup completed" printed by a tool that copied
 *     nothing is exactly the class of claim this study has retracted seven of.
 *
 * USAGE
 *   node tools/backup-results.mjs                          # incremental mirror
 *   node tools/backup-results.mjs --snapshot "mmu123 620 runs"   # mirror + point-in-time copy
 *   node tools/backup-results.mjs --verify                 # prove the mirror holds the source
 *   node tools/backup-results.mjs --watch 300              # every 5 minutes, forever
 *
 * LAYOUT
 *   <to>/mirror/                     incremental mirror of <from>
 *   <to>/snapshots/<ts>-<label>/     point-in-time copies (hardlinks, or copies on fallback)
 *   <to>/manifest.json               what was backed up, when, how many bytes
 *   <to>/log.jsonl                   append-only history, one line per backup
 *
 * The default target is <repo>/../betterharness-backups; override with --to or the
 * BETTERHARNESS_BACKUP environment variable, or list extra targets in .backup-targets.json
 * (one path per line or a JSON array) for an external or synced drive.
 *
 * --to IS EXCLUSIVE. It used to be additive: targets were [--to, ...defaults], so every run of
 * tools/backup-results.test.mjs - the suite whose entire job is to protect the archive - also
 * mirrored its 3 tiny fixture files into the REAL backup root. In the live root that overwrote
 * mirror/ds-full/runs.jsonl (3,194,918 bytes of DeepSeek records -> 26 bytes of '{"task":"a"}'),
 * rewrote manifest.json to claim a %TEMP% directory as its source, and left seven snapshots
 * named "mmu123 620 runs" holding 54 bytes of fixture apiece. Every test still passed.
 * If you genuinely want an extra target AND the defaults, pass --also-defaults.
 *
 * A mirror also refuses a second source: one --to directory mirrors one --from directory, unless
 * --allow-source-change says otherwise. Mixing sources is how the fixtures came to own the
 * manifest.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync,
  copyFileSync, renameSync, linkSync, appendFileSync } from 'node:fs'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const REPO = resolve(here, '..')

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = (n) => argv.includes(n)

const source = resolve(opt('--from', join(REPO, 'results')))
const quiet = has('--quiet')
const verifyOnly = has('--verify')
const label = opt('--snapshot', null)
const watchSecs = Number(opt('--watch', 0))
const targets = []
const explicit = opt('--to', null)
if (explicit) targets.push(resolve(explicit))
// AN EXPLICIT --to NAMES THE TARGETS. The defaults are added only when no --to was given, or
// when --also-defaults asks for them on purpose - see the note in the header for what the
// additive version did to the real backup root.
const allowSourceChange = has('--allow-source-change')
if (!explicit || has('--also-defaults')) {
  for (const t of resolveTargets()) if (!targets.includes(t)) targets.push(t)
}

function resolveTargets () {
  const out = []
  if (process.env.BETTERHARNESS_BACKUP) out.push(resolve(process.env.BETTERHARNESS_BACKUP))
  const cfg = join(REPO, '.backup-targets.json')
  if (existsSync(cfg)) {
    try {
      const j = JSON.parse(readFileSync(cfg, 'utf8'))
      for (const t of Array.isArray(j) ? j : (j.targets ?? [])) if (typeof t === 'string' && t.trim()) out.push(resolve(t.trim()))
    } catch (e) { console.error('WARN .backup-targets.json is not readable JSON: ' + e.message) }
  }
  if (!out.length) out.push(resolve(REPO, '..', 'betterharness-backups'))
  return out
}

function fail (msg, code = 3) { console.error('backup-results: ' + msg); process.exit(code) }

/**
 * Walk a tree, yielding { rel, abs, size, mtimeMs }.
 *
 * `results/_scratch` IS SKIPPED, and that is a rule rather than a workaround. safe-fs designates
 * that directory as the scratch root - the one place in the archive that a caller may delete -
 * so by definition it holds nothing that must survive. Backing it up was how ONE locked file in
 * it (a browser cache Edge had left open, from a mistake of mine) took down the backup of the
 * entire 620-run DeepSeek matrix: EBUSY on `Cookies`, exit 3, no snapshot, no commit.
 *
 * A backup whose completeness depends on the lock state of a throwaway file is not a backup of
 * the evidence, it is a backup of everything including the rubbish. Scratch is reported as
 * skipped, never silently.
 */
function walk (root, { skipScratch = true } = {}) {
  const out = []
  const scratch = join(root, '_scratch')
  const go = (dir) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const abs = join(dir, e.name)
      if (skipScratch && abs === scratch) continue
      if (e.isDirectory()) { go(abs); continue }
      let st
      try { st = statSync(abs) } catch { continue }
      if (!st.isFile()) continue
      out.push({ rel: relative(root, abs).split(sep).join('/'), abs, size: st.size, mtimeMs: st.mtimeMs })
    }
  }
  go(root)
  return out
}

/** Copy a -> b, then RENAME into place, so any hardlinked snapshot keeps the old bytes. */
function stage (from, to) {
  mkdirSync(dirname(to), { recursive: true })
  const tmp = to + '.incoming-' + process.pid.toString(36) + Math.random().toString(36).slice(2, 6)
  copyFileSync(from, tmp)
  try { renameSync(tmp, to) } catch (e) {
    try { copyFileSync(tmp, to); renameSync(tmp, tmp + '.deleting') } catch {}
    throw e
  }
}

function backupTo (to) {
  const stats = { copied: 0, kept: 0, bytes: 0, files: 0, snapshot: null }
  if (!existsSync(source)) fail('nothing to back up: no source at ' + source, 2)

  // A backup inside the working tree is not a backup.
  if (to === REPO || to.startsWith(REPO + sep)) {
    fail('refusing: the backup root ' + to + ' is inside the working tree (' + REPO + ').\n' +
      '  A backup that the same accident can reach is not a backup. Put it outside, or set\n' +
      '  BETTERHARNESS_BACKUP / .backup-targets.json to a second directory or an external drive.', 2)
  }
  if (to.startsWith(source + sep) || to === source) fail('refusing: the backup root is inside the source', 2)

  // ONE MIRROR, ONE SOURCE. A mirror that silently accepts a second source cannot be trusted to
  // hold the first one: the manifest is rewritten to the newest source, so the tree it describes
  // stops matching the tree it holds. This is exactly the state a run of the backup test's
  // fixture left the real root in.
  const manifestPath = join(to, 'manifest.json')
  if (existsSync(manifestPath) && !allowSourceChange) {
    let prev = null
    try { prev = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch {}
    if (prev && prev.source && resolve(prev.source) !== resolve(source)) fail(
      'refusing: ' + to + ' is already the mirror of\n' +
      '    ' + prev.source + '\n' +
      '  and this run would write\n' +
      '    ' + source + '\n' +
      '  into it. Two sources in one mirror is how the real archive came to hold test fixtures.\n' +
      '  Use a different --to, or --allow-source-change if you mean to repoint this mirror.', 3)
  }

  const mirror = join(to, 'mirror')
  mkdirSync(mirror, { recursive: true })
  const files = walk(source)
  const scratchFiles = walk(source, { skipScratch: false }).length - files.length
  if (scratchFiles > 0 && !quiet) {
    console.log('    skipped ' + scratchFiles + ' file(s) under results/_scratch - scratch is not evidence')
  }

  for (const f of files) {
    const dest = join(mirror, ...f.rel.split('/'))
    stats.files++
    stats.bytes += f.size
    let same = false
    try {
      const st = statSync(dest)
      // Size AND mtime. Size alone misses an edit that keeps the length; mtime alone
      // re-copies everything after a touch.
      same = st.size === f.size && Math.abs(st.mtimeMs - f.mtimeMs) < 2
    } catch {}
    if (same) { stats.kept++; continue }
    stage(f.abs, dest)
    stats.copied++
  }

  if (label) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safe = String(label).replace(/[^A-Za-z0-9._ -]+/g, '_').slice(0, 60).trim() || 'snapshot'
    const snapDir = join(to, 'snapshots', stamp + '__' + safe)
    let linked = 0, copiedSnap = 0
    for (const f of files) {
      const src = join(mirror, ...f.rel.split('/'))
      const dst = join(snapDir, ...f.rel.split('/'))
      mkdirSync(dirname(dst), { recursive: true })
      try { linkSync(src, dst); linked++ }
      catch { copyFileSync(src, dst); copiedSnap++ }
    }
    writeFileSync(join(snapDir, 'SNAPSHOT.json'), JSON.stringify({
      label, takenAt: new Date().toISOString(), source, files: files.length,
      bytes: files.reduce((n, f) => n + f.size, 0), hardlinked: linked, copied: copiedSnap,
    }, null, 2) + '\n')
    stats.snapshot = snapDir
  }

  const manifest = {
    source, mirror, updatedAt: new Date().toISOString(),
    files: stats.files, bytes: stats.bytes, copiedThisRun: stats.copied, unchanged: stats.kept,
    snapshot: stats.snapshot,
  }
  writeFileSync(join(to, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  appendFileSync(join(to, 'log.jsonl'), JSON.stringify({ ts: manifest.updatedAt, ...manifest }) + '\n')
  return stats
}

function verifyTo (to) {
  const mirror = join(to, 'mirror')
  if (!existsSync(mirror)) fail('no mirror at ' + mirror + ' - nothing has been backed up yet', 4)
  const files = walk(source)
  const missing = [], drift = []
  for (const f of files) {
    const dest = join(mirror, ...f.rel.split('/'))
    try {
      const st = statSync(dest)
      if (st.size !== f.size) drift.push(f.rel + ' (' + st.size + ' vs ' + f.size + ' bytes)')
    } catch { missing.push(f.rel) }
  }
  const mirrored = walk(mirror).length
  console.log('  verify ' + to)
  console.log('    source files : ' + files.length)
  console.log('    mirrored     : ' + mirrored + (mirrored > files.length ? '  (' + (mirrored - files.length) + ' extra - kept on purpose; the backup never deletes)' : ''))
  if (missing.length) console.log('    MISSING      : ' + missing.length + '\n      ' + missing.slice(0, 10).join('\n      '))
  if (drift.length) console.log('    DRIFT        : ' + drift.length + '\n      ' + drift.slice(0, 10).join('\n      '))
  return { missing: missing.length, drift: drift.length, files: files.length, mirrored }
}

function once (opts = {}) {
  let ok = true
  for (const to of targets) {
    try {
      if (verifyOnly) {
        const v = verifyTo(to)
        if (v.missing || v.drift) ok = false
        continue
      }
      const s = backupTo(to)
      if (!quiet || opts.always) {
        console.log('  backup ' + to)
        console.log('    files ' + s.files + '   copied ' + s.copied + '   unchanged ' + s.kept + '   ' + (s.bytes / 1048576).toFixed(1) + ' MB')
        if (s.snapshot) console.log('    snapshot ' + s.snapshot)
      }
    } catch (e) {
      console.error('backup-results: FAILED for ' + to + ': ' + e.message)
      ok = false
    }
  }
  return ok
}

// ------------------------------------------------------------------ main
if (!targets.length) fail('no backup target configured', 2)
if (!quiet) {
  console.log('backup-results')
  console.log('  source  : ' + source)
  for (const t of targets) console.log('  target  : ' + t)
  console.log('  mode    : ' + (verifyOnly ? 'verify' : 'mirror' + (label ? ' + snapshot "' + label + '"' : '')) +
    (watchSecs ? '   watching every ' + watchSecs + 's' : ''))
}

if (watchSecs > 0) {
  const tick = () => {
    const ok = once({ always: false })
    if (!ok) console.error('backup-results: a target failed at ' + new Date().toISOString())
  }
  tick()
  setInterval(tick, watchSecs * 1000)
} else {
  const ok = once({ always: !quiet })
  process.exit(ok ? 0 : (verifyOnly ? 4 : 3))
}
