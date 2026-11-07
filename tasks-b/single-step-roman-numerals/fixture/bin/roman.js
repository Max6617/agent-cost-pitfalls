#!/usr/bin/env node
/**
 * roman — command-line front end.
 *
 *   node bin/roman.js parse XLII [--lenient]
 *   node bin/roman.js format 2024
 *   node bin/roman.js canonicalize DCCCC
 */
import { parse, format, canonicalize } from '../src/index.js'

const [command, arg, ...rest] = process.argv.slice(2)
const lenient = rest.includes('--lenient')

try {
  if (command === 'parse') {
    process.stdout.write(String(parse(arg, lenient ? { mode: 'lenient' } : {})) + '\n')
  } else if (command === 'format') {
    process.stdout.write(format(Number(arg)) + '\n')
  } else if (command === 'canonicalize') {
    process.stdout.write(canonicalize(arg) + '\n')
  } else {
    process.stderr.write('usage: roman <parse|format|canonicalize> <arg> [--lenient]\n')
    process.exitCode = 2
  }
} catch (err) {
  process.stderr.write('error: ' + err.message + '\n')
  process.exitCode = 1
}
