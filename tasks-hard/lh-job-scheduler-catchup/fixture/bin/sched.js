#!/usr/bin/env node
/**
 * sched - print the plan the batch tier would follow at a given instant.
 *
 *   node bin/sched.js --now 2024-03-31T04:00:00.000Z --window 6h
 *
 * Read-only and clock-free: it builds a scheduler at `--now`, asks for the plan
 * and prints it. It never ticks anything.
 */
import { createScheduler, loadConfig, loadJobs, parseDuration, time } from '../src/index.js'

const argv = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const index = argv.indexOf('--' + name)
  return index >= 0 ? argv[index + 1] : fallback
}
const say = (message) => {
  if (!argv.includes('--quiet')) process.stdout.write(message + '\n')
}

const now = time.parseInstant(flag('now'), '--now')
const windowMs = parseDuration(flag('window', '2h'))

const scheduler = createScheduler({ jobs: loadJobs(), config: loadConfig(), now })
const plan = scheduler.planNext(now, windowMs, { perJob: 3 })

say('plan at ' + time.toIso(now) + ' over ' + windowMs + 'ms')
if (!plan.length) say('nothing due')
for (const entry of plan) {
  say([
    entry.iso,
    entry.jobId.padEnd(16),
    entry.pool.padEnd(8),
    entry.retry ? 'retry' : entry.overdue ? 'overdue' : 'upcoming',
  ].join('  '))
}
say(plan.length + ' run(s) across ' + new Set(plan.map((entry) => entry.jobId)).size + ' job(s)')
