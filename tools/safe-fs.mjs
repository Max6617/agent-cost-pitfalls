/**
 * safe-fs.mjs - the ONLY module in this repository allowed to delete anything.
 *
 * WHY THIS EXISTS. On 2026-10-02 tools/preflight.mjs ran
 *   rmSync(outDir, { recursive: true, force: true })
 * with outDir taken verbatim from --out, and the author typed `--out results`. That single
 * call removed 24 matrices, ~5,900 run records and ~102,000 gateway records - roughly EUR 900
 * of API spend across five providers. results/ was gitignored, so git held nothing; rmSync
 * does not use the Recycle Bin; Volume Shadow Copies and System Protection were off; the disk
 * is a TRIM-enabled NVMe, so raw carving was closed. Zero run records were recovered.
 *
 * A hostile review had NAMED that exact line: "rmSync(outDir, recursive) on a verbatim --out
 * (preflight.mjs:60, :107) would delete the entire results archive given --out results." The
 * author guarded :107 and then typed --out results to test the guard. :60 ran first.
 *
 * SO THE GUARD IS NO LONGER A CHECK AT A CALL SITE. It is this module, and the call sites are
 * gone. safeClean/safeRemove refuse any path that:
 *
 *   R1. is not strictly inside a DESIGNATED SCRATCH ROOT,
 *   R2. is git-tracked (or contains anything git-tracked),
 *   R3. contains a runs.jsonl, ANY *.jsonl, or a task.json,
 *   R4. is results/ itself, or any DIRECT CHILD of results/.
 *
 * There is NO OVERRIDE FLAG. There is no `force`, no `allow`, no environment variable, and
 * adding one is the defect this file exists to prevent. If a call site cannot satisfy these
 * rules, the call site is wrong.
 *
 * DESIGNATED SCRATCH ROOTS - nothing outside these is ever deletable:
 *   - the `_scratch` directory under results/, at any depth below it
 *   - any other directory NAMED `_scratch` inside the repo, at any depth below it
 *     (task-local scratch: tasks-hard/<task>/_scratch/tmp-armfail/wd)
 *   - a `dsh-exp-...` directory in the OS temp directory, at any depth below it
 *     (the per-run harness workdirs the runner creates and has to remove)
 *
 * R4 carves the archive back OUT of the first root: results/_scratch is a direct child of
 * results/ and is refused; results/_scratch/x is not and is allowed. The brief's regression
 * test pins exactly that asymmetry.
 *
 * Usage from PowerShell or a test:
 *   node tools/safe-fs.mjs clean  results/_scratch/preflight
 *   node tools/safe-fs.mjs remove results/_scratch/throwaway.txt
 */
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync, unlinkSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Thrown instead of deleting something we are not certain is scratch. */
export class UnsafePathError extends Error {
  constructor (message, detail) {
    super('refusing to delete ' + message)
    this.name = 'UnsafePathError'
    this.code = 'UNSAFE_PATH'
    this.detail = detail || null
  }
}

const SCRATCH_DIR_NAME = '_scratch'
const TMP_WORKDIR_PREFIX = 'dsh-exp-'

/** Every file whose presence marks a directory as evidence rather than scratch. */
function isRecordName (name) {
  const n = String(name).toLowerCase()
  return n.endsWith('.jsonl') || n === 'task.json' || n === 'runs.jsonl'
}

/** Path helper: is `child` the same as, or strictly inside, `parent`? */
function insideOrEqual (child, parent) {
  if (child === parent) return true
  return child.startsWith(parent.endsWith(sep) ? parent : parent + sep)
}

function isStrictlyInside (child, parent) {
  return child !== parent && child.startsWith(parent.endsWith(sep) ? parent : parent + sep)
}

/**
 * R1. Is this absolute path inside one of the three designated scratch roots?
 * Returns a descriptive root label so the refusal message can say WHICH root was expected.
 */
function scratchRootFor (abs) {
  // (a) the in-repo scratch root
  const inRepoScratch = join(REPO, 'results', SCRATCH_DIR_NAME)
  if (isStrictlyInside(abs, inRepoScratch)) return inRepoScratch

  // (b) ANY directory called _scratch inside the repo, e.g. tasks-hard/<task>/_scratch
  if (isStrictlyInside(abs, REPO)) {
    const parts = relative(REPO, abs).split(sep)
    if (parts.includes(SCRATCH_DIR_NAME)) {
      const i = parts.indexOf(SCRATCH_DIR_NAME)
      if (i < parts.length - 1) return join(REPO, ...parts.slice(0, i + 1))
    }
  }

  // (c) per-run harness workdirs in the OS temp directory
  const tmp = resolve(tmpdir())
  if (isStrictlyInside(abs, tmp)) {
    const rel = relative(tmp, abs).split(sep)
    if (rel.length >= 1 && rel[0].startsWith(TMP_WORKDIR_PREFIX)) return join(tmp, rel[0])
  }

  return null
}

/** R2. Does git track this path, or anything beneath it? Skipped outside the repo. */
let trackedCache = null
function gitTracked (abs) {
  if (!insideOrEqual(abs, REPO) || abs === REPO) return false
  const rel = relative(REPO, abs)
  try {
    const out = execFileSync('git', ['ls-files', '-z', '--', rel], { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' })
    if (out && out.length) return true
  } catch {
    // Not a git repository, or git is unavailable. Fall back to the whole index, computed
    // once, so we still refuse rather than assume "untracked" on the strength of an error.
    if (trackedCache === null) {
      try {
        trackedCache = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).split('\0').filter(Boolean)
      } catch { trackedCache = [] }
    }
    const prefix = rel.split(sep).join('/')
    return trackedCache.some((f) => f === prefix || f.startsWith(prefix + '/'))
  }
  return false
}

/** R3. Does this directory hold a record? Walks it; returns the first offending path. */
function findRecordUnder (abs) {
  if (!existsSync(abs)) return null
  const stack = [abs]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { stack.push(p); continue }
      if (isRecordName(e.name)) return p
    }
  }
  return null
}

/** R4. results/ itself, or any direct child of results/. */
function archiveReason (abs) {
  const archive = join(REPO, 'results')
  if (abs === archive) return 'the results archive itself'
  if (dirname(abs) === archive) return 'a direct child of the results archive (' + basename(abs) + ')'
  return null
}

/**
 * Run every guard. Throws UnsafePathError. Exported so a caller can ask BEFORE acting.
 * `target` is resolved against the process cwd, exactly as rmSync would resolve it.
 */
export function assertDeletable (target, { mustBeDirectory = false } = {}) {
  if (typeof target !== 'string' || !target.trim()) {
    throw new UnsafePathError('an empty path', { target })
  }
  if (target.includes('\0')) throw new UnsafePathError('a path containing NUL', { target })

  const abs = resolve(target)
  const why = { target, resolved: abs }

  // A drive root, a UNC share root, or the filesystem root. Never.
  const parsed = parse(abs)
  if (abs === parsed.root) throw new UnsafePathError('a filesystem root', why)
  if (abs === REPO) throw new UnsafePathError('the repository root', why)

  // R4 first: it is the cheapest and it is the one that destroyed the study.
  const archive = archiveReason(abs)
  if (archive) {
    throw new UnsafePathError(archive, { ...why, rule: 'R4', note: 'the archive is evidence; only things strictly inside results/_scratch are scratch' })
  }

  // R1: strictly inside a designated scratch root.
  if (!scratchRootFor(abs)) {
    throw new UnsafePathError(abs, {
      ...why,
      rule: 'R1',
      note: 'not strictly inside a designated scratch root. Allowed roots: ' +
        join(REPO, 'results', '_scratch') + '/**, ' + join(REPO, '**', '_scratch') + '/**, ' +
        join(resolve(tmpdir()), TMP_WORKDIR_PREFIX + '*') + '/**',
    })
  }

  // R1b: the path must not ESCAPE its scratch root through a symlink or junction. Resolve
  // the real path and re-run R1, R4 against it, so a link into results/ cannot be laundered.
  let real = abs
  if (existsSync(abs)) {
    try { real = realpathSync(abs) } catch { real = abs }
    if (real !== abs) {
      if (!scratchRootFor(real)) {
        throw new UnsafePathError(abs, { ...why, rule: 'R1', note: 'resolves to ' + real + ', which is outside every scratch root' })
      }
      const realArchive = archiveReason(real)
      if (realArchive) throw new UnsafePathError(realArchive, { ...why, rule: 'R4', note: 'resolves to ' + real })
    }
    const st = lstatSync(abs, { throwIfNoEntry: false })
    if (mustBeDirectory && st && !st.isDirectory()) {
      throw new UnsafePathError(abs, { ...why, note: 'expected a directory' })
    }
  }

  // R2: git-tracked, or containing anything git-tracked.
  if (gitTracked(abs)) {
    throw new UnsafePathError(abs, { ...why, rule: 'R2', note: 'git tracks this path or something beneath it; if git knows about it, it is not scratch' })
  }

  // R3: holds a record. This is the rule that makes "scratch root" safe to have at all:
  // a directory with a runs.jsonl, any *.jsonl, or a task.json is EVIDENCE, and it does not
  // stop being evidence because somebody put it under a directory called _scratch.
  const st = lstatSync(abs, { throwIfNoEntry: false })
  if (st && st.isDirectory()) {
    const hit = findRecordUnder(abs)
    if (hit) {
      throw new UnsafePathError(abs, { ...why, rule: 'R3', note: 'contains a run record: ' + hit })
    }
  }
  return abs
}

/** Count files beneath a path, so the caller gets told what it actually removed. */
function countFiles (abs) {
  if (!existsSync(abs)) return 0
  const st = lstatSync(abs)
  if (!st.isDirectory()) return 1
  let n = 0
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const p = join(abs, e.name)
    if (e.isDirectory()) n += countFiles(p)
    else n++
  }
  return n
}

/**
 * Recursively remove a SCRATCH DIRECTORY. Returns the number of files removed.
 * A missing path returns 0 rather than throwing - the guards still run first, so
 * safeClean('results/ds-full') throws even though nothing is there.
 */
export function safeClean (dir, _optsIgnored) {
  const abs = assertDeletable(dir, { mustBeDirectory: true })
  const files = countFiles(abs)
  if (existsSync(abs)) rmSync(abs, { recursive: true, force: true })
  return files
}

/**
 * Remove a SINGLE SCRATCH FILE. Refuses anything matching *.jsonl, task.json, runs.jsonl,
 * anything git-tracked, and anything named like a credential.
 * Returns true if a file was removed, false if it was already absent.
 */
export function safeRemove (file, _optsIgnored) {
  if (typeof file === 'string' && /(^|[\\/])\.?keys\.[^\\/]*$|(^|[\\/])[^\\/]*\.key$|FILL-IN-KEYS\.json$/i.test(file)) {
    throw new UnsafePathError(file, { target: file, rule: 'CRED', note: 'looks like a credential store' })
  }
  const abs = resolve(file)
  // A record is never a throwaway, even inside a scratch root.
  if (isRecordName(basename(abs))) {
    throw new UnsafePathError(abs, { target: file, rule: 'R3', note: 'this is a run record (' + basename(abs) + '), not scratch' })
  }
  assertDeletable(abs)
  const st = lstatSync(abs, { throwIfNoEntry: false })
  if (st && st.isDirectory()) {
    throw new UnsafePathError(abs, { target: file, note: 'safeRemove is for single files; use safeClean for a directory' })
  }
  if (!st) return false
  rmSync(abs, { force: true })
  return true
}

/**
 * Remove a SYMLINK or JUNCTION, and nothing else.
 *
 * tools/repair-profile-links.mjs has a legitimate need to unlink ~242 dangling junctions under
 * ~/.dsh/profiles, which is outside the repo and therefore outside every scratch root. Deleting
 * a LINK is not deleting data - the target is untouched and the link is rebuildable - so it gets
 * its own primitive rather than an exemption from safeClean. The guard is the lstat: if the
 * path is a real file or a real directory, this refuses, and the caller has to use safeClean.
 */
export function safeUnlinkLink (path) {
  if (typeof path !== 'string' || !path.trim()) throw new UnsafePathError('an empty path', { target: path })
  const abs = resolve(path)
  const st = lstatSync(abs, { throwIfNoEntry: false })
  if (!st) return false
  if (!st.isSymbolicLink()) {
    throw new UnsafePathError(abs, {
      target: path, rule: 'LINK',
      note: 'not a symlink or junction. safeUnlinkLink only ever removes a link; use safeClean for a real directory',
    })
  }
  unlinkSync(abs)
  return true
}

// ---------------------------------------------------------------- CLI
// So a .ps1 or a shell one-liner can use the same guard instead of Remove-Item.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const [cmd, target] = process.argv.slice(2)
  try {
    if (cmd === 'clean') {
      const n = safeClean(target)
      console.log('safe-fs: removed ' + n + ' file(s) from ' + target)
    } else if (cmd === 'remove') {
      console.log('safe-fs: ' + (safeRemove(target) ? 'removed ' : 'already absent: ') + target)
    } else if (cmd === 'unlink') {
      console.log('safe-fs: ' + (safeUnlinkLink(target) ? 'unlinked ' : 'already absent: ') + target)
    } else if (cmd === 'check') {
      assertDeletable(target)
      console.log('safe-fs: ALLOWED ' + resolve(target))
    } else {
      console.error('usage: node tools/safe-fs.mjs clean|remove|unlink|check <path>')
      process.exit(2)
    }
  } catch (e) {
    console.error('safe-fs: ' + e.message)
    if (e.detail && e.detail.note) console.error('         ' + e.detail.note)
    process.exit(1)
  }
}
