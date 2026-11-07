#!/usr/bin/env node
/**
 * slugify - turn each argument into a slug, one per line.
 *
 *   node bin/slugify.js "Hello, World!"
 *   node bin/slugify.js --max 40 --taken hello-world "Hello, World!"
 *
 * The import job pipes the incoming catalogue's titles through this.
 */
import { slugify } from '../src/index.js'

const args = process.argv.slice(2)
const titles = []
const existing = []
let maxLength

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--max') maxLength = Number(args[++i])
  else if (args[i] === '--taken') existing.push(args[++i])
  else titles.push(args[i])
}

const options = {}
if (maxLength !== undefined) options.maxLength = maxLength
if (existing.length > 0) options.existing = existing

for (const title of titles) {
  process.stdout.write(slugify(title, options) + '\n')
}
