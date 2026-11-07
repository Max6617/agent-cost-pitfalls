#!/usr/bin/env node
/**
 * report - run one saved query over the export and print the page.
 *
 *   node bin/report.js queries/top-regions.json
 *   node bin/report.js queries/top-regions.json --page 2
 *
 * The service embeds the engine and never calls this; it exists so that a
 * report builder can check a query document against the real export before
 * saving it. Paths are resolved from this file, not from the working directory,
 * so it runs from anywhere in the checkout.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runQuery } from '../src/index.js'
import { formatFooter, formatTable } from '../src/util/format.js'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: node bin/report.js <query.json> [--page N]')
  process.exit(2)
}

const config = readJson(join(repo, 'config', 'report.config.json'))
const rows = readJson(join(repo, config.dataFile))
const query = readJson(resolve(process.cwd(), args[0]))

const page = Number(args[args.indexOf('--page') + 1])
const pageSize = config.defaultPageSize
if (query.limit === undefined && Number.isInteger(page) && page > 1) {
  query.offset = (page - 1) * pageSize
  query.limit = pageSize
}

const result = runQuery(rows, query)
console.log(formatTable(result))
console.log('')
console.log(formatFooter(result))
