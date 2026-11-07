#!/usr/bin/env node
/**
 * dsv-import — read one file the way the inbox is configured, and either print
 * what the loader would see or write the file back out.
 *
 *   node bin/import.js data/suppliers.csv
 *   node bin/import.js data/suppliers.csv --rewrite
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, write, sniffDialect } from '../src/index.js'
import { warn } from '../src/util/log.js'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')
const config = JSON.parse(readFileSync(join(root, 'config', 'import.config.json'), 'utf8'))

const [target, ...flags] = process.argv.slice(2)
if (!target) {
  console.error('usage: node bin/import.js <file> [--rewrite] [--sniff]')
  process.exit(2)
}

const text = readFileSync(resolve(target), 'utf8')
const dialect = flags.includes('--sniff')
  ? { ...config.dialect, ...sniffDialect(text) }
  : config.dialect

const { columns, rows } = parse(text, dialect)
warn('import', 'read ' + rows.length + ' row(s) as ' + JSON.stringify(columns))

if (flags.includes('--rewrite')) {
  process.stdout.write(write({ columns, rows }, dialect))
} else {
  console.log(JSON.stringify({ columns, rows }, null, 2))
}
