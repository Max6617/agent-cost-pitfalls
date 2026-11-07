#!/usr/bin/env node
/**
 * plan — ask the planner when a schedule runs next.
 *
 *   node bin/plan.js "*/15 9-17 * * MON-FRI"
 *   node bin/plan.js --count 3 --from 2024-03-01T00:00:00Z "0 0 1 * *"
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseSchedule, nextOccurrences, describeSchedule, ScheduleError } from '../src/index.js'
import { daysInMonth } from '../src/index.js'
import { createLog } from '../src/util/log.js'

const here = dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(readFileSync(join(here, '..', 'config', 'planner.config.json'), 'utf8'))
const log = createLog(process.env.PLAN_LOG ?? 'warn')

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}
const expression = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--'))).pop()

if (!expression) {
  console.error('usage: plan [--count N] [--from INSTANT] "<expression>"')
  process.exit(2)
}

// A quick sanity line so an operator can see the horizon the planner believes
// in before it starts walking days.
log.debug('february 2024 has', daysInMonth(2024, 2), 'days')

try {
  const count = Number(flag('--count', config.defaultCount))
  const from = flag('--from', '2024-01-01T00:00:00Z')
  parseSchedule(expression)
  log.info(describeSchedule(expression))
  for (const instant of nextOccurrences(expression, from, Math.min(count, config.maxCount))) {
    console.log(instant)
  }
} catch (error) {
  if (error instanceof ScheduleError) {
    console.error(error.code + ': ' + error.message)
    process.exit(1)
  }
  throw error
}
