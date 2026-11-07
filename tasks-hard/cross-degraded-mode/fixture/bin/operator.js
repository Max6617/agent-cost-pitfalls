#!/usr/bin/env node
/**
 * The on-call console.
 *
 *   node bin/operator.js state db.primary
 *   node bin/operator.js degrade payment.charges
 *   node bin/operator.js restore db.replica
 *
 * It runs against the configured service with no transports wired, which is
 * enough to read and write the marks: the console is what an operator uses
 * before the incident call, not during it.
 */
import { createService, loadConfig } from '../src/index.js'

const [command, name] = process.argv.slice(2)
const config = loadConfig()
const service = createService({ config, clock: () => 0, transports: {} })

function usage() {
  console.log('usage: operator.js <state|degrade|restore> [dependency]')
  console.log('dependencies: ' + Object.keys(config.dependencies).join(', '))
}

switch (command) {
  case 'state': {
    const names = name ? [name] : Object.keys(config.dependencies)
    for (const dep of names) {
      console.log(dep.padEnd(20) + service.statusOf(dep))
    }
    break
  }
  case 'degrade':
  case 'restore': {
    if (!name) { usage(); process.exit(2) }
    if (!config.dependencies[name]) { console.error('unknown dependency: ' + name); process.exit(2) }
    if (command === 'degrade') service.markDegraded(name)
    else service.markHealthy(name)
    console.log(name + ' ' + service.statusOf(name))
    break
  }
  default:
    usage()
    process.exit(2)
}
