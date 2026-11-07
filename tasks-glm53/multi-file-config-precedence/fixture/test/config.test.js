import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve, resolveWithOrigins, publicConfig } from '../src/loader.js'
import { DEFAULTS } from '../src/defaults.js'
import { run } from '../src/cli.js'

/** A filesystem stub: only the two calls the loader makes. */
export function fakeFs(files = {}) {
  return {
    existsSync: (p) => Object.prototype.hasOwnProperty.call(files, p),
    readFileSync: (p) => files[p],
  }
}

const CONFIG_PATH = '/etc/ingest/config.json'

const fileLayer = {
  port: 8080,
  topic: 'ingest.prod',
  origins: ['file:///srv/drop/incoming'],
  limits: { maxInflight: 16 },
  labels: { env: 'prod', team: 'platform' },
  secrets: { apiKey: 'file-layer-key' },
}

/** Fixture used by most of the cases below. */
export function prodInput(overrides = {}) {
  return {
    fs: fakeFs({ [CONFIG_PATH]: JSON.stringify(fileLayer) }),
    path: CONFIG_PATH,
    env: {},
    opts: {},
    ...overrides,
  }
}

test('with no file, env or options the shipped defaults apply', () => {
  const c = resolve({ fs: fakeFs(), path: null, env: {}, opts: {} })
  assert.equal(c.port, 8080)
  assert.equal(c.topic, 'ingest.default')
  assert.deepEqual(c.origins, DEFAULTS.origins)
  assert.deepEqual(c.limits, { maxBatchBytes: 8 * 1024 * 1024, maxInflight: 4 })
})

test('the config file beats the defaults', () => {
  const c = resolve(prodInput())
  assert.equal(c.topic, 'ingest.prod')
  assert.equal(c.limits.maxInflight, 16)
})

test('objects merge recursively rather than being replaced', () => {
  const c = resolve(prodInput())
  assert.equal(c.limits.maxBatchBytes, 8 * 1024 * 1024, 'untouched default must survive')
  assert.equal(c.limits.maxInflight, 16, 'file value wins')
  assert.deepEqual(c.labels, { env: 'prod', team: 'platform' })
})

test('the environment beats the config file', () => {
  const c = resolve(prodInput({ env: { INGEST_PORT: '9000', INGEST_TOPIC: 'ingest.staging' } }))
  assert.equal(c.port, 9000)
  assert.equal(c.topic, 'ingest.staging')
})

test('programmatic options beat the environment', () => {
  const c = resolve(prodInput({ env: { INGEST_PORT: '9000' }, opts: { port: 9100 } }))
  assert.equal(c.port, 9100)
})

test('a host option becomes the public origin', () => {
  const c = resolve(prodInput({ opts: { hosts: ['ingest.example.com/'] } }))
  assert.equal(c.origin, 'https://ingest.example.com')
})

test('the origin option is still configurable from the environment', () => {
  const c = resolve(prodInput({ env: { INGEST_ORIGIN: 'https://staging.example.com' } }))
  assert.equal(c.origin, 'https://staging.example.com')
})

test('origins accumulate across layers in precedence order', () => {
  const c = resolve(
    prodInput({
      env: { INGEST_ORIGINS: 'file:///srv/drop/second' },
      opts: { origins: ['s3://bucket/drop'] },
    }),
  )
  assert.deepEqual(c.origins, [
    'file:///var/lib/ingest/drop',
    'file:///srv/drop/incoming',
    'file:///srv/drop/second',
    's3://bucket/drop',
  ])
})

test('an origin listed twice is only watched once', () => {
  const c = resolve(
    prodInput({
      env: { INGEST_ORIGINS: 'file:///srv/drop/incoming' },
      opts: { origins: ['file:///srv/drop/incoming', 's3://bucket/drop'] },
    }),
  )
  assert.deepEqual(c.origins, [
    'file:///var/lib/ingest/drop',
    'file:///srv/drop/incoming',
    's3://bucket/drop',
  ])
})

test('explain reports which layer owns each key', () => {
  const { origins } = resolveWithOrigins(
    prodInput({ env: { INGEST_PORT: '9000' }, opts: { hosts: ['ingest.example.com'] } }),
  )
  assert.equal(origins.topic, 'file')
  assert.equal(origins.port, 'env')
  assert.equal(origins.origin, 'cli')
  assert.equal(origins.limits, 'file')
})

test('a wrong type is a hard error, named per key', () => {
  assert.throws(
    () => resolve({ fs: fakeFs({ [CONFIG_PATH]: JSON.stringify({ port: '8080' }) }), path: CONFIG_PATH, env: {}, opts: {} }),
    /port should be number/,
  )
})

test('secrets are redacted at every depth before logging', () => {
  const safe = publicConfig(resolve(prodInput()))
  assert.equal(safe.secrets, '***')
  assert.equal(JSON.stringify(safe).includes('file-layer-key'), false)
})

test('a credential nested under another key never survives redaction', () => {
  const safe = publicConfig({
    port: 1,
    origins: { 's3://bucket': { apiKey: 'nested-key' } },
  })
  assert.equal(JSON.stringify(safe).includes('nested-key'), false)
})

test('the CLI prints the effective config without any secret material', () => {
  const text = run(['--config', CONFIG_PATH, '--port', '9100', '--host', 'ingest.example.com'], {
    fs: fakeFs({ [CONFIG_PATH]: JSON.stringify(fileLayer) }),
    env: {},
  })
  const printed = JSON.parse(text)
  assert.equal(printed.config.port, 9100)
  assert.equal(printed.config.origin, 'https://ingest.example.com')
  assert.equal(text.includes('file-layer-key'), false)
})

test('the CLI --explain report agrees with the resolved values', () => {
  const text = run(['--config', CONFIG_PATH, '--port', '9100', '--explain'], {
    fs: fakeFs({ [CONFIG_PATH]: JSON.stringify(fileLayer) }),
    env: { INGEST_TOPIC: 'ingest.canary' },
  })
  const printed = JSON.parse(text)
  assert.equal(printed.config.topic, 'ingest.canary')
  assert.equal(printed.config.port, 9100)
  assert.equal(printed.origins.port, 'cli')
  assert.equal(printed.origins.topic, 'env')
})
