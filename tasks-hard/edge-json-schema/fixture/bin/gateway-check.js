#!/usr/bin/env node
/**
 * gateway-check — run one payload against one schema file, the way the gateway's
 * staging environment does.
 *
 *   node bin/gateway-check.js config/example.schema.json payload.json
 *
 * It is a debugging tool: it prints the report the gateway would have logged and
 * exits non-zero when the payload is rejected.
 */
import { readFileSync } from 'node:fs'
import { validate, SchemaError, SUBSET_VERSION } from '../src/index.js'
import { plural, truncate } from '../src/util/text.js'

const [schemaPath, payloadPath] = process.argv.slice(2)
if (!schemaPath || !payloadPath) {
  console.error('usage: gateway-check <schema.json> <payload.json>')
  process.exit(2)
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

let report
try {
  report = validate(readJson(schemaPath), readJson(payloadPath))
} catch (error) {
  if (error instanceof SchemaError) {
    console.error(`schema is not valid for subset v${SUBSET_VERSION}: ${error.message}`)
    process.exit(3)
  }
  throw error
}

if (report.valid) {
  console.log('accepted')
  process.exit(0)
}

console.error(`rejected: ${plural(report.errors.length, 'failure')}`)
for (const entry of report.errors) {
  console.error(`  ${entry.path || '<body>'}  ${entry.keyword}  ${truncate(entry.message, 72)}`)
}
process.exit(1)
