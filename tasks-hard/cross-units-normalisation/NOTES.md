# cross-units-normalisation

**stratum:** cross-cutting — one policy (a single canonical representation, one
conversion at each boundary) applied at every call site, easy to half-do.
**prompt:** "Latency has been unaccountable since the last release. A call we
configure with a 1.5s timeout behaves like one second, the retry budget and the
per-attempt timeout disagree about how many attempts we get, and a cache entry
expires far too early for one caller while another still finds it long after its
TTL. The latency graph on the dashboard is in the wrong unit and the operator
report prints numbers nobody can match against the config file. Make the service
behave the way docs/units.md says it does; the tests under test/ are the
reproductions we managed to write, not the whole acceptance criteria."

The contract is `fixture/docs/units.md`: durations are integer milliseconds and
sizes are integer bytes everywhere inside `src/`, the only conversions are
`parseDuration`/`parseSize` (config in) and `formatDuration`/`formatSize` (report
out), a positive duration rounds **up** when it is read, lifetimes publish in
whole seconds rounded **up** and thresholds rounded **down**, and every module's
options say their unit in the field name.

## Sub-problems (one hidden file each)

| hidden file | cases | sub-problem | call site that holds the wrong unit |
|---|---|---|---|
| `01-parsing` | 4 | the parser: suffixes, whitespace, fractions, bare numbers, sub-millisecond round-up, malformed and out-of-range input; plus the config file, its first caller | `src/units.js` — `parseInt` truncates `'1.5s'` to 1000, only `ms`/`s` exist, no trimming, no maximum, plain `Error`; `src/config.js` has a *second*, private reader that floors the fraction (`'1.5s'` → 1000), ignores `m`/`h` (`'5m'` → 5) and reads a size as a duration (`'8kb'` → 8) |
| `02-format` | 4 | the writer and the round trip: largest exact unit, normalisation, idempotence, sizes | `src/units.js` — `formatDuration` prints everything as `ms/1000 + 's'` (`250` → `'0.25s'`, `0` → `'0s'`), `formatSize` divides by 1000 |
| `03-http-retry` | 4 | the client's timeout and the retry backoff/budget against a per-attempt timeout | `src/retry.js` — `budgetMs` is stored divided by 1000, so a 30 s budget is 30 and `floor(30/8000)` allows no attempt at all; `backoffMs(n)` is off by one and unclamped |
| `04-cache-limiter` | 4 | the cache TTL and the rate-limit window, both deadlines | `src/cache.js` — the deadline is `nowMs + ttlMs / 1000` and the boundary is `>`; `src/ratelimit.js` — the window is compared against `windowMs / 1000` |
| `05-metrics-log` | 4 | observations in the histogram, the slow threshold and the record's byte size, and the two published whole-second fields | `src/metrics.js` — an observation is divided by 1000 before it is compared to the bounds and added to `sumMs`; `src/log.js` — the threshold is divided by 1000, `bytes` is `line.length` instead of the UTF-8 length; `stats()` uses `Math.round` in both modules where the direction is documented per field |
| `06-scheduler-cli` | 3 | the tick interval and the report that prints it all back | `src/scheduler.js` — the step is `tickMs / 1000`; `src/cli.js` is *correct* (it calls the formatter), which is why the report is wrong only where the formatter or the loader is |

Nothing else is wrong: `src/http-client.js` and `src/cli.js` already use the
canonical unit and are not part of the reference — an agent that "fixes" them is
breaking mainline behaviour.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 4/11 pass, exit 1 | **4/23 = 17%** |
| reference | 11/11 pass, exit 0 | **23/23 = 100%** |

Reference changes 8 files, each by a few lines:
`src/{units,config,retry,cache,ratelimit,metrics,log,scheduler}.js`.

Partial solutions, measured by overlaying subsets of `reference/` on the fixture:

| solution | hidden |
|---|---|
| untouched | 4/23 = 17% |
| `units.js` only (parser + writer) | 10/23 = 43% |
| `units.js` + `config.js` | 12/23 = 52% |
| every module except `config.js` | 16/23 = 70% |
| everything except the two modules with published whole-second fields | 19/23 = 83% |
| reference | 23/23 = 100% |

The four cases the untouched fixture passes are the guards below, so the floor is
17%. The gradient is carried by the call sites the prompt does not mention
(`src/log.js` has no visible reproduction at all, `src/config.js` is a second
parser nobody is pointed at) and by the three boundary rules that read the same
quantity three different ways: round up when reading, round the published
lifetime up, round the published threshold down.

## Interaction cases (8 of 23)

1. `01#4` — the config loader is the parser's first caller: one hidden case reads
   every field the file writes and requires the canonical number, so the private
   reader in `config.js` and the parser have to agree (and sizes have to go
   through the size reader).
2. `02#6` — round trip: `parseDuration(formatDuration(x)) === x` needs the writer
   *and* the reader to be right; either one alone leaves it failing.
3. `02#8` — normalisation reaches into the config file:
   `formatDuration(loadConfig().cache.ttlMs) === '5m'` needs the loader, the
   parser and the writer.
4. `03#12` — a `"1.5s"` timeout from the config file must arrive at the client as
   1500 ms *and* the retry budget must be compared against it as milliseconds;
   the same case pins the sub-millisecond rule (`parseDuration('0.4ms')` is 1 ms,
   never a zero timeout, so a 1 ms response is not a timeout and a 2 ms one is).
5. `04#16` — the window from the config file (`"1m"`) rolls over at exactly
   60000 ms, while the same case checks the 1000 ms boundary on a direct instance.
6. `05#18` — the histogram's bounds come from the config file (`"2.5s"` is 2500,
   and a 2400 ms observation is in that bucket while an 800 ms one is not), so
   the loader and the histogram have to mean the same thing.
7. `05#20` — the two published fields round in *opposite* directions: a 1400 ms
   TTL publishes 2 and a 2500 ms threshold publishes 2. One case, two modules,
   and the two rules fight each other.
8. `06#23` — every duration and size in the operator report reads back as the
   value the service is actually using (formatter + parser + loader + the
   canonical option each module stores).

Also invisible to the visible suite, and therefore only reachable by reading
`docs/units.md`: `03#10` (the first backoff waits exactly the base delay and the
cap holds), `05#19` (the whole log writer, including the UTF-8 byte count) and the
"exactly at the maximum" pair (`'24h'`/`'1gb'` accepted, `'90000s'`/`'2gb'`
refused).

## Guards (pass on the untouched fixture on purpose, 4 of 23)

- `03#9` — the client already compares `responseMs > timeoutMs` in milliseconds,
  and equality is not a timeout.
- `04#15` — the limiter already refuses the `limit + 1`-th request while the clock
  stands still.
- `05#17` — an unused histogram is empty, with every bound reported.
- `06#22` — the report already names every operator field once, in order.

Together they are the floor: 4/23. They exist so that a rewrite which rips out the
client, the limiter, the empty-histogram path or the report's shape scores below a
solution that only half-finishes the sweep.

## Notes and uncertainty

- Every expectation is anchored in `fixture/docs/units.md`, which states the
  syntax table, the rounding directions (including why a lifetime and a threshold
  round opposite ways) and the per-module return shapes. Nothing in the hidden
  suite depends on a private module: all six files import `../src/index.js` only.
- The task is deterministic: no clock, no randomness, no network, no filesystem
  writes, no `process.cwd()`. `loadConfig` resolves the config file relative to
  `import.meta.url`, and time is passed in as `nowMs`.
- The visible suite is 11 cases and covers the easy end of the prompt's named
  symptoms only. A solution that greens it and stops is measured at roughly
  70-83% depending on which call sites it happened to touch, above the 40-65%
  calibration note in AUTHORING.md; what is left is `src/log.js`,
  `src/config.js`'s second reader and the three rounding directions.
- `reference/` changes 8 files, at the top of the 4-8 the calibration table
  suggests, but each change is one or two expressions: this is a sweep of one
  policy, not a rewrite.
