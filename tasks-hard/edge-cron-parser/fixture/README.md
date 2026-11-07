# planner

The schedule-expression planner behind the job runner: it parses a cron-like
expression, validates it, and works out when the job runs next.

```
bin/plan.js                 the CLI the ops team uses
config/planner.config.json  CLI defaults (the library never reads it)
docs/schedule-rules.md      the rules the runner was built against - the contract
src/                        the implementation
test/                       the reproductions we wrote down; a subset of what
                            the scheduler's acceptance checks cover
```

## Use

```js
import { parseSchedule, nextOccurrences, matches, ScheduleError } from './src/index.js'

parseSchedule('*/15 9-17 * * MON-FRI')          // validates, throws ScheduleError
nextOccurrences('0 0 1 * *', '2024-01-15T00:00:00Z', 2)
//   -> ['2024-02-01T00:00:00Z', '2024-03-01T00:00:00Z']
matches('0 0 1 * *', '2024-02-01T00:00:00Z')    // -> true
```

`nextOccurrences(expression, from, count)` and `matches(expression, instant)`
take the instant they start from as an argument; neither reads the system clock.
Both accept an expression string or the object `parseSchedule` returned.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the runner imports these
  files directly and there is no build step.
- No dependencies. The runner's container has no network and no registry.
- `src/index.js` is the public surface, and it is stable: everything the runner
  and the acceptance checks use is re-exported there. Anything else under `src/`
  is internal and may be reorganised.
- `node --test` from this directory runs the reproductions in `test/`.
- Errors the input caused are `ScheduleError`s with a `code` from
  `docs/schedule-rules.md`. Anything else that escapes the planner is a bug.
