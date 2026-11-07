#!/usr/bin/env node
/**
 * The dev server. This is not the production edge - it exists so that a laptop
 * can exercise the service with no store, no cache and no broker behind it.
 *
 *   node bin/serve.js get r-1
 */
import {
  newContext,
  createMemoryStore,
  createMemoryCache,
  createRepository,
  createCache,
  createService,
  buildSuccess,
  buildErrorResponse,
} from '../src/index.js'
import { truncate } from '../src/util/text.js'

const now = 0
const ctx = newContext('dev-1')
const token = { value: 'dev', subject: 'dev', scopes: ['records:read', 'records:write'], expiresAt: now + 60_000 }
const service = createService({
  repository: createRepository(createMemoryStore()),
  cache: createCache(createMemoryCache()),
})

const [command, id] = process.argv.slice(2)

try {
  if (command === 'get') {
    console.log(JSON.stringify(buildSuccess(service.getRecord(id, { token }, { ctx, now }), { ctx })))
  } else {
    console.log('usage: node bin/serve.js get <id>')
  }
} catch (error) {
  const response = buildErrorResponse(error, { ctx })
  console.log(JSON.stringify(response))
  console.log('[dev] ' + truncate(error && error.message ? error.message : String(error), 80))
  process.exitCode = 1
}
