/**
 * Site configuration.
 *
 * The engine itself is pure: it never reads a file, and everything it needs is
 * passed to the constructor. This module is for the edges — the CLI and the
 * nightly console job — which load the site's settings and hand them over.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** The repository root of this checkout (the directory holding src/). */
export function repoRoot() {
  return resolve(here, '..')
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function loadConfig(root = repoRoot()) {
  const site = readJson(join(root, 'config', 'warehouse.config.json'))
  const catalogue = readJson(join(root, 'data', 'skus.json'))
  return {
    site: site.site,
    packSize: site.picking.packSize,
    defaultTtlMs: site.holds.defaultTtlMs,
    channels: site.channels,
    skus: catalogue.skus,
  }
}
