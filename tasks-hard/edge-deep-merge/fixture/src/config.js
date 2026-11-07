/**
 * Where the shipped defaults live.
 *
 * The config service resolves paths from the repository, not from the working
 * directory it happens to be started in, so the root is derived from this
 * module's own location.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** The repository root: the directory that holds package.json. */
export function repoRoot() {
  return resolve(here, '..')
}

export function repoPath(...parts) {
  return join(repoRoot(), ...parts)
}

/** Read and parse a JSON file. Throws with the path in the message. */
export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (cause) {
    throw new Error('cannot read JSON from ' + path + ': ' + cause.message)
  }
}

/** The defaults this repository ships. */
export function loadDefaults() {
  return readJson(repoPath('config', 'app.defaults.json'))
}
