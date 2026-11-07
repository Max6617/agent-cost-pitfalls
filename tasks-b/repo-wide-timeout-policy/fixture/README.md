# herald

Outbound integration clients for the billing worker: one small library that
builds the call plans for every external system we talk to — HTTP, the
database, the job queue, the cache and the webhook dispatcher.

```
config/dispatch.config.json   shipped overrides and batch sizes
docs/timeout-policy.md        the timeout policy every caller signed up to
src/                          the implementation
bin/dispatch.js               manual webhook replay used by ops
test/                         reproductions; a subset of what CI checks
```

## Use

```js
import { createApp } from './src/index.js'

const app = createApp()                                   // documented defaults
const app2 = createApp({ timeouts: { overrides: { 'db.query': 400 } } })

app.http.fetch('/health', { timeout: 1500 })
//   -> { url, method, headers, timeoutMs }
app.db.query('select 1', [], { timeout: 800 })
//   -> { sql, params, timeoutMs }
app.queue.poll({ timeout: 5000 })
//   -> { messages, timeoutMs }
app.webhooks.deliver({ id: 'evt-1', kind: 'invoice.paid' })
//   -> { event, attempts, timeoutMs }
```

Each client returns the **plan** it hands to its driver; `timeoutMs` on the
plan is the timeout the driver will run with. Where `timeoutMs` comes from is
not up to the client: `docs/timeout-policy.md` is the contract, agreed before
this code existed. When the code and the document disagree, the document is
right.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  worker imports these files directly.
- No dependencies. The billing container has no network and no package
  registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Timeouts cross the public surface as plain numbers of milliseconds.
- Nothing in the library reads the clock, sleeps, or retries on its own;
  scheduling belongs to the worker that drives these clients.
