/**
 * Migrate the installed presets across the 0.1.7 package rename.
 *
 * 0.1.5-alpha.1 -> 0.1.7-rc.2 renamed two packages the presets reference:
 *   @deepseek-ai/dsh-agent-presets          -> @deepseek-ai/dsh-agent-preset
 *   @deepseek-ai/dsh-workflow-worker-thread -> @deepseek-ai/dsh-workflow-ptc
 *
 * The old names still exist on npm as placeholder 0.0.1-rc.x versions, so this
 * fails quietly: the loader cannot resolve the module and the row is dropped,
 * which is why validate-presets.mjs is the check that catches it.
 *
 * This rewrites the NAME only - the row ids are our own labels and stay stable,
 * so the diffs against the previous generation remain readable.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { dshHome } from './lib-yaml.mjs'

const RENAMES = [
  ['@deepseek-ai/dsh-workflow-worker-thread', '@deepseek-ai/dsh-workflow-ptc'],
  ['@deepseek-ai/dsh-agent-presets', '@deepseek-ai/dsh-agent-preset'],
]

const root = process.argv[2] ?? join(dshHome(), '.agent-presets')
if (!existsSync(root)) { console.error('no presets at ' + root); process.exit(2) }

let touched = 0, total = 0
for (const dir of readdirSync(root)) {
  const file = join(root, dir, 'agent.cordis.yml')
  if (!existsSync(file)) continue
  total++
  let src = readFileSync(file, 'utf8')
  const before = src
  for (const [from, to] of RENAMES) src = src.split(from).join(to)
  if (src !== before) {
    writeFileSync(file, src)
    touched++
    const which = RENAMES.filter(([f]) => before.includes(f)).map(([f, t]) => f.split('/').pop() + ' -> ' + t.split('/').pop())
    console.log('  ' + dir.padEnd(16) + which.join(', '))
  }
}
console.log('')
console.log(touched + ' of ' + total + ' presets updated')
if (!touched) console.log('(nothing referenced the old names)')
