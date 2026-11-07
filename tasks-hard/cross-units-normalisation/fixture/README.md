# units-service

The planner behind the request path: it decides how long a call may take, when to
retry, what to cache, how fast callers may go, and what the operator dashboard
shows. It performs no I/O of its own — a "response" is a number of milliseconds
handed in by the caller — so everything below is deterministic and testable
without a clock, a socket or a timer.

```
config/service.config.json   the operator knobs, written as duration strings
docs/units.md                the units policy - treat it as the contract
src/                         the implementation
src/index.js                 the public surface
test/                        reproductions; a subset of what the service checks
bin/report.js                prints the operator report
```

## Use

```js
import { createService, parseDuration, formatDuration } from './src/index.js'

const service = createService()            // config/service.config.json
service.client.timeoutMs                   // 1500
service.retry.schedule({ perAttemptTimeoutMs: service.client.timeoutMs })
service.cache.set('orders', rows, 0)
service.cache.get('orders', 2000)          // undefined once the TTL has elapsed
service.limiter.take(0)
service.metrics.observe(800)
service.log.write({ path: '/orders' }, 800)
service.scheduler.ticksUntil(5000)

createService({ cache: { ttlMs: 1000, maxEntries: 8 } })   // one group at a time
```

`createService(overrides)` reads the config file and replaces whole groups with
whatever is passed in, so an override has to name every field of that group.
Every call builds a new planner: the configuration is read again, and no cache,
counter, histogram or limiter is shared between two of them.

## Conventions

- ESM only, no dependencies. The container has no network and no package
  registry, and the service runs on the Node standard library alone.
- `src/index.js` is the public surface; everything else under `src/` is internal
  and may be reorganised. The names in `index.js` may not change.
- Every duration that crosses the surface is an integer number of milliseconds and
  every size an integer number of bytes, exactly as `docs/units.md` says. The
  field name carries the unit.
- Nothing reads a clock, a random source or the working directory: callers pass
  `nowMs` and the response time they are asking about.
- Run the reproductions with `npm test` (`node --test`).
