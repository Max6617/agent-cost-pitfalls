# gateway

The edge request pipeline: one request walks a fixed chain of stages and every
stage is written down as it goes.

```
config/gateway.config.json   timeouts, retry policy, limiter capacity
docs/pipeline-policy.md      the policy the gateway is supposed to implement
src/                         the implementation
test/                        the reproductions we managed to write
```

## Use

```js
import { createPipeline, createToken, createClock, createDeadlineToken } from './src/index.js'

const clock = createClock(0)
const pipeline = createPipeline({ clock, upstream: async ({ request }) => ({ ok: true }) })

const result = await pipeline.run({ route: '/v1/echo', apiKey: 'k-1', tenant: 'acme' })
result.status   // 'completed' | 'cancelled'
result.stages   // ['auth', 'cache', 'limit', 'queue', 'upstream', 'record', 'cleanup']
result.response // whatever the upstream returned
```

A run takes `token`, `deadline`, `ref`, `route`, `tenant`, `query`, `apiKey` and,
for diagnostics, `onStage` — a function called with each stage's name as the
stage is entered. The run's token is the caller's token, the deadline, or both
as one; a deadline passed as a number is read on the pipeline's clock.

Everything the pipeline needs from the outside world is **injected**:
`upstream`, `clock`, `sleep`, `cache`, `limiter`, `queue`, `audit` and `policy`.
Nothing in `src/` reads a real clock, a real timer, a socket or a random source,
so a run is completely determined by its arguments. That is deliberate - the
conformance suite depends on it.

## The stages

| stage | what it does | what it holds |
|---|---|---|
| `auth` | turns the request's credentials into a principal | nothing |
| `cache` | answers from the cache, or reserves the key | a reservation on the key |
| `limit` | takes a rate-limit slot for this caller | one slot |
| `queue` | submits a job for the work | one waiting job |
| `upstream` | claims the job and makes the call | nothing |
| `record` | writes the audit line | nothing, and never rolled back |
| `cleanup` | the last step of every run, cancelled or not | nothing |

`record` and `cleanup` are steps of every run rather than stages a checkpoint can
skip: see `docs/pipeline-policy.md` section 4. A cache hit ends the run at
`cache` - no slot is taken, no job is submitted and the upstream is not called.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the edge builder imports
  these files directly and there is no bundler in the loop.
- No dependencies. The gateway container has no network and no registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and may be reorganised; the surface may not.
- `docs/pipeline-policy.md` is the agreed policy. Where the code and the
  document disagree, the document is right and the code is the bug.
