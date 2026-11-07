/**
 * credit-alert.test.mjs - the alarm must not cry wolf.
 *
 * THE BUG, 2026-10-03. The window sat flashing red "provider out of credit" for Alibaba/Qwen.
 * Qwen had never had a credit error: zero credit-classified runs in 2,487 records across five
 * datasets, and check-providers reported it FUNDED throughout. What had happened is that
 * collect.mjs's SPEND METER - a local budget stop, nothing to do with the provider - posted
 *   { provider: 'qwen', reason: 'matrix stopped by the spend meter: $10.81 of a $12 ceiling' }
 * with no state field, and credit-alert.mjs defaulted the missing state to 'empty':
 *
 *     manual.push({ ..., state: j.state ?? 'empty' })
 *
 * So the loudest possible claim - PROVIDER OUT OF CREDIT, flashing, with a recommended top-up
 * of $11 - was the DEFAULT for a message that said the opposite in its own text. A monitoring
 * tool that invents the worst case is worse than no monitoring tool: it sends you to a billing
 * console for a problem you do not have, and it trains you to ignore it.
 *
 * THE RULE PINNED HERE: 'empty' must be something a caller SAYS, never something it fails to
 * say. An unlabelled or unrecognised state is a warning, not an outage.
 *
 * Run: node --test tools/credit-alert.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')

function freePort () {
  return new Promise((res, rej) => {
    const s = createServer()
    s.once('error', rej)
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
  })
}

async function withServer (fn) {
  const port = await freePort()
  const child = spawn(process.execPath, [join(here, 'credit-alert.mjs'), '--port', String(port)], {
    cwd: repo, stdio: 'ignore',
  })
  try {
    let up = false
    for (let i = 0; i < 60; i++) {
      try { await fetch('http://127.0.0.1:' + port + '/state'); up = true; break } catch { await new Promise((r) => setTimeout(r, 250)) }
    }
    if (!up) throw new Error('credit-alert did not come up on ' + port)
    return await fn(port)
  } finally {
    try { child.kill() } catch {}
  }
}

const stateOf = async (port, id) => {
  const s = await (await fetch('http://127.0.0.1:' + port + '/state')).json()
  return { worst: s.worst, provider: s.providers?.[id] ?? null }
}
const post = (port, path, body) => fetch('http://127.0.0.1:' + port + path, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
})

test('a spend-meter stop is NOT reported as the provider being out of credit', async () => {
  await withServer(async (port) => {
    await post(port, '/alert', { provider: 'qwen', reason: 'matrix stopped by the spend meter: $10.81 of a $12 ceiling' })
    const s = await stateOf(port, 'qwen')
    assert.notEqual(s.provider.state, 'empty',
      'a local budget stop must never render as "provider out of credit" - that is what sent a reader ' +
      'to the Alibaba billing console for a provider that was funded the whole time')
    assert.notEqual(s.worst, 'empty', 'the window must not go red for a spend-meter stop')
    // The reason must still be visible: it is true and it is the useful part.
    assert.match(String(s.provider.detail), /spend meter/)
  })
})

test('an explicit credit alert still goes red', async () => {
  await withServer(async (port) => {
    await post(port, '/alert', { provider: 'qwen', reason: 'check-providers reports no usable credit', state: 'empty' })
    const s = await stateOf(port, 'qwen')
    assert.equal(s.provider.state, 'empty', 'a real credit failure must still be reported as one')
    assert.equal(s.worst, 'empty')
  })
})

test('an explicit warn stays amber, not red', async () => {
  await withServer(async (port) => {
    await post(port, '/alert', { provider: 'qwen', reason: 'approaching the ceiling', state: 'warn' })
    const s = await stateOf(port, 'qwen')
    assert.equal(s.provider.state, 'warn')
    assert.notEqual(s.worst, 'empty')
  })
})

test('clear removes the alert', async () => {
  await withServer(async (port) => {
    await post(port, '/alert', { provider: 'qwen', reason: 'x', state: 'empty' })
    assert.equal((await stateOf(port, 'qwen')).provider.state, 'empty')
    await post(port, '/clear')
    const s = await stateOf(port, 'qwen')
    assert.notEqual(s.provider.state, 'empty', 'a cleared alert must stop being red')
  })
})
