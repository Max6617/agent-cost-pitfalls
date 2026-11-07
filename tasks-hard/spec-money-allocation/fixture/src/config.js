/**
 * Configuration and data files.
 *
 * The toolkit ships with the currency table and the console's defaults, so the
 * service does not have to thread them through every call. Paths are resolved
 * from this file's own location: the billing container starts the job from
 * wherever it likes and `process.cwd()` is not reliable there.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)

/** Read one of the JSON files that ship with the checkout. */
export function readJson(relativePath) {
  const url = new URL(relativePath, root)
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
}

/** The console's defaults. */
export function defaults() {
  return readJson('config/billing.config.json')
}

/** Where a shipped data file lives, as an absolute path. */
export function dataPath(relativePath) {
  return fileURLToPath(new URL(relativePath, root))
}
