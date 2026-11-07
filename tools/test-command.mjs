/**
 * test-command.mjs — turn a repo-relative grader command into one the shell can run.
 *
 * spec.test runs with a temp copy of fixture/ as its cwd (run-experiment, validate-tasks).
 * A path like `node tasks-hard/_grade/run.mjs <id>` does not exist there. Rewrite `node <rel>`
 * to an absolute path when that file exists in this repository. Leave `node --test`, commands
 * that are already absolute, and scripts that are not in the repo alone: those resolve against
 * the workdir, which is what batch 1's `node --test` needs.
 */
import { existsSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

export function resolveTestCommand(cmd, repoRoot) {
  const m = /^node\s+(\S+)([\s\S]*)$/.exec(String(cmd).trim())
  if (!m) return cmd
  const script = m[1]
  if (script.startsWith('-') || isAbsolute(script)) return cmd
  const abs = resolve(repoRoot, script)
  if (!existsSync(abs)) return cmd
  const shown = abs.split('\\').join('/')
  const quoted = /[\s"]/.test(shown) ? '"' + shown.replace(/"/g, '') + '"' : shown
  return 'node ' + quoted + m[2]
}
