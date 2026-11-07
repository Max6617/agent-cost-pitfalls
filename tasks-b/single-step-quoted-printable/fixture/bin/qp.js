#!/usr/bin/env node
/**
 * Pipe filter: `node bin/qp.js encode` or `node bin/qp.js decode`.
 * Reads stdin, writes stdout. Used by the gateway's smoke script.
 */
import { readFileSync } from 'node:fs'
import { encode, decode } from '../src/index.js'

const mode = process.argv[2]
if (mode !== 'encode' && mode !== 'decode') {
  console.error('usage: node bin/qp.js encode|decode')
  process.exit(2)
}

const input = readFileSync(0, 'utf8')
process.stdout.write(mode === 'encode' ? encode(input) : decode(input))
