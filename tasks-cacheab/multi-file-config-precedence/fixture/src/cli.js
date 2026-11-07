#!/usr/bin/env node
/**
 * ingest config — print the effective configuration.
 *
 *   ingest config --explain
 *   ingest config --config /etc/ingest/config.json
 *
 * Thin wrapper: all of the interesting behaviour lives in src/loader.js so it
 * can be tested without spawning a process.
 */
import { resolve, resolveWithOrigins, publicConfig } from './loader.js'
import { splitList } from './sources.js'

/**
 * Parse argv into the option shape the loader wants.
 *
 * `--host` is the operator-facing name; the loader turns it into `origin`.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv = []) {
  const opts = {}
  let configPath = null
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = argv[i + 1]
    if (arg === '--port') { opts.port = Number(value); i++ }
    else if (arg === '--host') { opts.hosts = [value]; i++ }
    else if (arg === '--origin') { opts.origins = splitList(value); i++ }
    else if (arg === '--config') { configPath = value; i++ }
  }
  return { opts, configPath }
}

/**
 * Run the command and return the text to print.
 *
 * @param {string[]} argv
 * @param {{ fs: any, env?: Record<string,string|undefined>, explain?: boolean }} io
 */
export function run(argv, io) {
  const { opts, configPath } = parseArgs(argv)
  const input = { fs: io.fs, path: configPath, env: io.env ?? {}, opts }
  const explain = argv.includes('--explain')
  const result = explain ? resolveWithOrigins(input) : { config: resolve(input) }
  return JSON.stringify({ config: publicConfig(result.config), origins: result.origins ?? null }, null, 2)
}
