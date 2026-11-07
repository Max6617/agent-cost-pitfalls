# scheduler

Turns UTC instants into the local wall clock a site runs on, and turns a
requested wall clock back into the instant the job has to fire at. Offsets come
from a table shipped with the service, not from the host.

```
config/service.json    default zone and where the data lives
data/offsets.json      the offset table: per zone, the instant each offset starts
docs/time-rules.md     the rules operations signed off - treat as the contract
src/                   the implementation
test/                  reproductions; a subset of what the scheduler checks
bin/schedule.js        small CLI over the same surface
```

## Use

```js
import {
  offsetAt, instantToLocal, localToInstant,
  addToInstant, addToLocal,
  startOfLocalDay, endOfLocalDay, startOfLocalMonth, isSameLocalDay,
} from './src/index.js'

offsetAt('America/New_York', 1710054000000)      // -240, minutes east of UTC
instantToLocal('Europe/Berlin', 1711846800000)   // { year, month, day, hour, minute, second, offsetMinutes }
localToInstant('Europe/Berlin', '2024-03-31T02:30:00')
// { instant, offsetMinutes, resolution, local }

const next = addToInstant('Europe/Berlin', instant, { days: 1 })  // elapsed time
addToLocal('Europe/Berlin', '2024-03-30T02:30:00', { days: 1 })   // same wall clock

startOfLocalDay('Asia/Kolkata', instant)   // the instant local midnight happens
```

`resolution` is `'exact'`, `'nonexistent'` or `'ambiguous'`; `docs/time-rules.md`
§5 says which instant each of those means. A zone the table does not know throws
`UnknownZoneError` — there is no fallback.

## Conventions

- ESM only. `package.json` says `"type": "module"` and both the scheduler worker
  and the site importer import these files directly; do not change it.
- No dependencies. The service runs in a container with no network and no package
  registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the names re-exported there cannot.
- The library never reads the clock, `Intl`, `toLocaleString` or the host's
  timezone. Callers pass instants; the table supplies offsets. Anything that
  depends on where the process happens to run is a bug, and `node --test` is
  expected to give the same answer under any `TZ`.
- `data/offsets.json` is data produced by the operations extract. Correcting the
  service means correcting `src/`, never editing the table.

## Running it

```
node --test          # the reproduction suite
node bin/schedule.js --zone Europe/Berlin --at 2024-03-31T01:30:00Z
node bin/schedule.js --zone Europe/Berlin --local 2024-03-31T02:30:00
```
