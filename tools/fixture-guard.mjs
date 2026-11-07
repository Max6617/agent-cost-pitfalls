/**
 * fixture-guard.mjs - did the arm edit the files it is being graded by?
 *
 * THE PROBLEM, in one line. tasks/<task>/task.json grades with
 *   "test": "node --test"
 * executed IN THE AGENT'S WORKDIR, as the agent left it. Nothing restores the fixture's test
 * files first. So the cheapest way to "solve" a task is to weaken or delete an assertion, and
 * the run record - before this module - could not tell that apart from a real fix. This was
 * observed live on 2026-10-02: one arm editing test/money.test.js and test/summary.test.js on a
 * task whose prompt was "fix the money handling so the test suite under test/ passes".
 *
 * tasks-hard/ already defends against it structurally: its grader is staged from OUTSIDE the
 * workdir, so "deleting test/ in the fixture does not move the score by a single case".
 * The tasks/ suite, which is all of batch 1, does not.
 *
 * WHAT THIS MODULE DOES AND DOES NOT DO.
 *
 *   DOES   hash the fixture as it was laid down, hash it again after the agent has finished, and
 *          report every file that was modified, added or deleted - with test files called out
 *          separately, because those are the ones that change the verdict.
 *
 *   DOES NOT restore anything. It does not rewrite a test, re-run a suite, or alter a score.
 *          Changing the grading rule mid-study would silently change the treatment for every
 *          provider still to be collected. Measurement first: the analysis can stratify on
 *          `testsTouched`, and the decision to switch tasks/ to a hidden grader becomes an
 *          evidence-backed one instead of a guess.
 *
 * Deliberately content-hashed, not size-or-mtime: a same-length edit is the obvious way to game
 * a cheaper check, and it is caught by the test suite.
 */
import { readdirSync, readFileSync, statSync, lstatSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative, sep } from 'node:path'

/**
 * Paths that are the runner's or the harness's, not the fixture's. Counting these would bury the
 * signal in noise - cline writes a whole config tree, DSH a .harness-root, and opencode a config
 * file, into the same workdir.
 */
const IGNORED = [
  '.cline-config', '.harness-root', '.gateway-config.jsonc', '.grade', 'node_modules',
  '.git', '.opencode', '.goose', '.openhands', '.aider', '.venv', '__pycache__',
]
function ignored (rel) {
  return rel.split('/').some((seg) => IGNORED.includes(seg))
}

/** Is this a file whose content decides the verdict? */
function isTestPath (rel) {
  return /(^|\/)(test|tests|spec|__tests__)\//.test(rel) ||
    /\.(test|spec)\.[cm]?[jt]s$/.test(rel) ||
    /(^|\/)test_[^/]+\.py$/.test(rel) ||
    /(^|\/)[^/]+_test\.go$/.test(rel)
}

/** Walk a workdir and hash every fixture file. Returns { files: { rel: sha1 } }. */
export function snapshotFixture (dir) {
  const files = {}
  const go = (d) => {
    let entries
    try { entries = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const abs = join(d, e.name)
      const rel = relative(dir, abs).split(sep).join('/')
      if (ignored(rel)) continue
      let st
      try { st = lstatSync(abs) } catch { continue }
      if (st.isDirectory()) { go(abs); continue }
      if (!st.isFile()) continue
      try { files[rel] = createHash('sha1').update(readFileSync(abs)).digest('hex') }
      catch { files[rel] = 'unreadable' }
    }
  }
  go(dir)
  return { dir, files, at: new Date().toISOString() }
}

/**
 * Compare a snapshot to the workdir as it stands now.
 * @returns {{modified: string[], added: string[], deleted: string[], testsTouched: string[], testsModified: string[], testsDeleted: string[], testsAdded: string[]}}
 */
export function diffFixture (before, dir = before.dir) {
  const now = snapshotFixture(dir).files
  const was = before.files ?? {}
  const modified = [], added = [], deleted = []
  for (const [rel, hash] of Object.entries(now)) {
    if (!(rel in was)) added.push(rel)
    else if (was[rel] !== hash) modified.push(rel)
  }
  for (const rel of Object.keys(was)) if (!(rel in now)) deleted.push(rel)
  const s = (a) => a.sort()
  const tests = (a) => s(a.filter(isTestPath))
  return {
    modified: s(modified), added: s(added), deleted: s(deleted),
    testsModified: tests(modified), testsAdded: tests(added), testsDeleted: tests(deleted),
    testsTouched: s([...modified, ...added, ...deleted].filter(isTestPath)),
    filesTotal: Object.keys(was).length,
    filesChanged: modified.length + added.length + deleted.length,
  }
}

/** The one-line summary that goes on a run record. Kept small: this is on every run. */
export function summariseFixtureDiff (diff) {
  if (!diff) return null
  return {
    changed: diff.filesChanged,
    testsTouched: diff.testsTouched,
    modified: diff.modified.slice(0, 40),
    added: diff.added.slice(0, 40),
    deleted: diff.deleted.slice(0, 40),
    // The single boolean an analysis would stratify on. True means "this run's verdict was
    // produced by a suite the arm was free to edit", which is a property of the INSTRUMENT,
    // not of the model.
    gradedOnEditedTests: diff.testsTouched.length > 0,
  }
}

export { isTestPath, ignored }
