#!/usr/bin/env node
/**
 * route-lint — print the demo app's route table, and what a few sample targets
 * match against it.
 *
 *   node bin/route-lint.js [target ...]
 *
 * Used while wiring a new route up: it shows how the pattern was read and which
 * route wins for a target, without starting the server.
 */
import { readFileSync } from 'node:fs'
import { Router, parsePattern } from '../src/index.js'
import { demoRoutes } from '../examples/routes.js'
import { createLogger } from '../src/util/log.js'

const log = createLogger('route-lint')
const config = JSON.parse(readFileSync(new URL('../config/router.config.json', import.meta.url), 'utf8'))
const router = new Router({ caseSensitive: config.caseSensitive })

for (const { method, pattern, handler } of demoRoutes()) router.add(method, pattern, handler)

const shape = (pattern) =>
  parsePattern(pattern)
    .segments.map((element) => (element.name ? `${element.kind}(${element.name})` : element.kind))
    .join(' ')

log.info(`${router.routes().length} routes`)
for (const route of router.routes()) {
  log.info(`${route.method.padEnd(6)} ${route.pattern.padEnd(28)} ${shape(route.pattern)}`)
}

const targets = process.argv.slice(2)
if (targets.length === 0) {
  log.info('pass one or more request targets to see what they match')
} else {
  for (const target of targets) {
    const result = router.match('GET', target)
    const handler = result.handler ? result.handler.name : '-'
    log.info(`${target} -> ${handler} ${JSON.stringify(result.params)} ${JSON.stringify(result.query)}`)
  }
}
