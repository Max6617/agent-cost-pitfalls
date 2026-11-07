#!/usr/bin/env node
/**
 * Look up a message key from the bundled locales.
 *
 *   node bin/lookup.js <key> [locale] [n]
 *
 * Prints the rendered message. The CLI runs strict on purpose: a missing key
 * in a build script should fail the job, so it exits 1 when the service
 * raises MissingKeyError.
 */
import { createMessageService, builtinBundles, MissingKeyError } from '../src/index.js'

const [key, locale = 'en', n] = process.argv.slice(2)
const service = createMessageService({ bundles: builtinBundles, mode: 'strict' })

try {
  const text = service.t(key, { locale, n: n === undefined ? undefined : Number(n) })
  process.stdout.write(text + '\n')
} catch (err) {
  if (err instanceof MissingKeyError) {
    process.stderr.write(err.message + '\n')
    process.exit(1)
  }
  throw err
}
