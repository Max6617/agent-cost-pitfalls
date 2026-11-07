#!/usr/bin/env node
/**
 * Query the sample corpus from a terminal.
 *
 *   node bin/search.js lighthouse
 *   node bin/search.js '"keeper log"' -draft --limit 5
 *   node bin/search.js --stats
 */
import { readFileSync } from 'node:fs'
import { createIndex } from '../src/index.js'
import { pluralise, truncate } from '../src/util/text.js'

const CORPUS_URL = new URL('../data/sample-documents.json', import.meta.url)

function parseArgv(argv) {
  const options = { limit: undefined, offset: undefined, stats: false, terms: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--limit') { options.limit = Number(argv[i + 1]); i += 1; continue }
    if (arg === '--offset') { options.offset = Number(argv[i + 1]); i += 1; continue }
    if (arg === '--stats') { options.stats = true; continue }
    options.terms.push(arg)
  }
  return options
}

const options = parseArgv(process.argv.slice(2))
const corpus = JSON.parse(readFileSync(CORPUS_URL, 'utf8'))
const index = createIndex({ documents: corpus })

if (options.stats) {
  const stats = index.stats()
  console.log(stats.documents + ' ' + pluralise(stats.documents, 'document') + ', ' + stats.terms + ' ' + pluralise(stats.terms, 'term'))
  console.log('average length ' + stats.averageLength.toFixed(2))
} else {
  const query = options.terms.join(' ')
  const page = index.search(query, { limit: options.limit, offset: options.offset })
  console.log(page.total + ' ' + pluralise(page.total, 'hit') + ' for ' + JSON.stringify(query))
  for (const hit of page.hits) {
    const document = index.get(hit.id)
    console.log('  ' + hit.id + '  ' + hit.score.toFixed(4) + '  ' + truncate(document.title, 60))
  }
}
