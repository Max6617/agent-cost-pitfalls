# batch-scheduler

Decides what the batch tier runs, in what order, and what to do about the runs it
missed while the worker was down. It plans and it records; it never executes
anything, and it never reads a clock.

```
config/scheduler.config.json   pool limits and the defaults jobs inherit
data/jobs.json                 the tier as deployed
data/offsets.json              published UTC offsets - the only local-time source
docs/scheduling-rules.md       the rules ops signed off - treat as the contract
src/                           the implementation
bin/sched.js                   print the plan for a given instant
test/                          reproductions; a subset of what the batch checks
```

## Use

```js
import { createScheduler, loadConfig, loadOffsets } from './src/index.js'

// `now` is required: nothing here reads the clock, so the harness has to say
// which instant it is replaying.
const scheduler = createScheduler({ now: Date.parse('2024-03-04T00:00:00.000Z') })

scheduler.tick(Date.parse('2024-03-04T03:00:00.000Z'))   // the entries it recorded
scheduler.finish('invoice-sweep', { at: ..., ok: true }) // the outcome of a run
scheduler.planNext(now, 3600000, { perJob: 3 })          // what it still owes
scheduler.history({ jobId: 'invoice-sweep' })            // one entry per attempt
scheduler.state('invoice-sweep')                         // watermark, running, parked...
```

`createScheduler` reads this checkout's config, job list and offset table;
`jobs`, `config` and `offsets` can all be overridden, which is how the harness
replays a scenario. See `docs/scheduling-rules.md` for what every status and
reason means.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the runner
  and the CLI both import these files directly.
- No dependencies. The tier runs in a container with no network and no registry.
- **No clock and no randomness anywhere under `src/`.** "Now" is always an
  argument, schedules are computed from their spec, and local wall-clock time
  comes from the published offset table rather than from the host timezone. A
  replay of the same calls has to produce the same plan and the same history.
- Data files are read relative to this directory, never relative to the working
  directory.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the names re-exported from `src/index.js` cannot. In
  particular the helpers the runners and the on-call scripts use are part of that
  surface: `schedule.instantsBetween`, `offsets.{createOffsetTable, localToEpoch,
  epochToLocal, offsetAt}`, `backoff.{maxAttempts, backoffFor}`,
  `catchup.selectRuns`, `misfire.isMisfired`, `priority.orderJobs` and
  `time.parseInstant`.

## Running it

```sh
npm test                     # node --test, the reproductions under test/
node bin/sched.js --now 2024-03-31T04:00:00.000Z --window 6h
```

The tests under `test/` are the reproductions we managed to write from the
incident reports. They are not the acceptance criteria.
