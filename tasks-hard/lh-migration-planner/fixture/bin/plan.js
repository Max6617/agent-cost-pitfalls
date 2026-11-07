#!/usr/bin/env node
/**
 * plan - print the plan for a ticket export.
 *
 *   node bin/plan.js data/release-42.json
 *
 * The export is a JSON array of migrations, exactly as the change tickets
 * declare them. Nothing here reaches a database.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { planMigrations, renderPlan } from '../src/index.js'

const file = process.argv[2]
if (!file) {
  console.error('usage: node bin/plan.js <migrations.json>')
  process.exit(2)
}

const migrations = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'))
const plan = planMigrations(migrations)
console.log(renderPlan(plan))
process.exit(plan.status === 'ok' ? 0 : 1)
