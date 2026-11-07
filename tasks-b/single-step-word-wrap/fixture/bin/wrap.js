#!/usr/bin/env node
// Wrap text from the command line:
//   node bin/wrap.js --width 12 [--indent 2] "the text to wrap"
import { wrap } from '../src/index.js'

const args = process.argv.slice(2)
let width = 80
let indent = 0
const rest = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--width') width = Number(args[++i])
  else if (args[i] === '--indent') indent = Number(args[++i])
  else rest.push(args[i])
}
process.stdout.write(wrap(rest.join(' '), width, { indent }) + '\n')
