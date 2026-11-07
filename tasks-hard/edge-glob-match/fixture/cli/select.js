#!/usr/bin/env node
/**
 * glob-select -- run a pattern list over paths read from stdin.
 *
 *   node cli/select.js --dot --nocase '**' '!*.tmp' < paths.txt
 *
 * One path per line. The tool this ships with calls `select()` directly; this
 * wrapper exists so a pattern list can be tried out against a captured path list
 * before a job is scheduled.
 */
import { readFileSync } from 'node:fs'
import { select, isDirectory } from '../src/index.js'
import { summarizeSelection } from '../src/util/diagnostics.js'

const argv = process.argv.slice(2)
const options = {}
const patterns = []
for (const arg of argv) {
  if (arg === '--dot') options.dot = true
  else if (arg === '--nocase') options.nocase = true
  else if (arg.startsWith('--')) {
    console.error('unknown option ' + arg)
    process.exit(2)
  } else patterns.push(arg)
}

if (!patterns.length) {
  console.error("usage: glob-select [--dot] [--nocase] <pattern>... < paths.txt")
  process.exit(2)
}

const input = readFileSync(0, 'utf8')
const paths = input.split('\n').filter((line) => line.length > 0)

const selected = select(paths, patterns, options)
for (const path of selected) process.stdout.write(path + '\n')
console.error(summarizeSelection(selected, paths))
console.error(selected.filter(isDirectory).length + ' of them are directories')
