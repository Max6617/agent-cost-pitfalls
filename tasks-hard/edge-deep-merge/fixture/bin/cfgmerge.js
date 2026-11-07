#!/usr/bin/env node
/**
 * cfgmerge - merge a chain of configuration files and report the difference.
 *
 *   node bin/cfgmerge.js [--diff] [--json] <base.json> [override.json ...]
 *
 * With no arguments it merges the defaults this repository ships with the EU
 * override, which is the layout the service uses in production.
 */
import { readJson, repoPath } from '../src/config.js'
import { merge } from '../src/merge.js'
import { diff } from '../src/diff.js'
import { describePatch } from '../src/patch.js'
import { flatten, formatPath } from '../src/view.js'
import * as log from '../src/util/log.js'

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const paths = argv.filter((a) => !a.startsWith('--'))

const inputs = paths.length
  ? paths
  : [repoPath('config', 'app.defaults.json'), repoPath('examples', 'eu.override.json')]

log.enable()
log.note('files:')
for (const path of inputs) log.note('  ' + path)

const loaded = inputs.map((path) => readJson(path))
const merged = merge(...loaded)

if (flags.has('--json')) {
  process.stdout.write(JSON.stringify(merged, null, 2) + '\n')
} else {
  log.note('merged:')
  for (const [path, value] of flatten(merged)) {
    log.note('  ' + formatPath(path) + ' = ' + JSON.stringify(value))
  }
}

if (flags.has('--diff') || !flags.has('--json')) {
  const change = diff(loaded[0], merged)
  log.note('patch to apply the overrides: ' + describePatch(change))
}
