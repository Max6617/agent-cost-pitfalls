#!/usr/bin/env node
/**
 * glob-expand -- print the patterns a brace pattern stands for.
 *
 *   node cli/expand.js '{src,test}/**'
 */
import { expandBraces } from '../src/index.js'

const pattern = process.argv[2]
if (!pattern) {
  console.error('usage: glob-expand <pattern>')
  process.exit(2)
}

for (const alternative of expandBraces(pattern)) console.log(alternative)
