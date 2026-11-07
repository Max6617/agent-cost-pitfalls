# Units policy

Every quantity the service handles has exactly one internal representation, and
there are exactly two places where it is converted. `src/` is the implementation;
where the two disagree, this document is right and the code is a bug.

## 1. The canonical representation

| quantity | canonical unit | type |
|---|---|---|
| duration | millisecond | integer |
| size | byte | integer |

Once a value is inside `src/` it is a duration in whole milliseconds or a size in
whole bytes. It is never a number of seconds, never a kibibyte count, never a
float and never a string. A module that takes a duration takes integer
milliseconds; a module that returns a duration returns integer milliseconds. The
same holds for sizes and bytes.

No module converts between units on its own. The conversions live in
`src/units.js` and are used at exactly two boundaries:

- **in** — `config/service.config.json` is written by humans, so its duration and
  size fields are strings, and the loader reads them with `parseDuration` /
  `parseSize`;
- **out** — the operator report is read by humans, so `renderReport` writes every
  duration with `formatDuration` and every size with `formatSize`.

Between those two boundaries nothing divides by a thousand. A module that finds
itself holding seconds has already made a mistake.

## 2. Reading a duration

`parseDuration(value)` returns integer milliseconds.

| input | result |
|---|---|
| `250` | `250` |
| `250.4` | `251` |
| `'250'` | `250` |
| `'250ms'` | `250` |
| `'1.5s'` | `1500` |
| `' 30 s '` | `30000` |
| `'1.5 m'` | `90000` |
| `'2h'` | `7200000` |
| `'24h'` | `86400000` |
| `'0.4ms'` | `1` |
| `0`, `'0ms'` | `0` |
| `'abc'`, `''`, `'s'`, `'1d'`, `-1`, `null`, `NaN` | throws `RangeError` |
| `86400001`, `'90000s'` | throws `RangeError` |

Rules:

- The suffix is one of `ms`, `s`, `m`, `h`. There is no other suffix and no
  repeated one. A value with no suffix is milliseconds, so `250` and `'250'` and
  `'250ms'` are the same duration.
- Whitespace around the number, between the number and the suffix, and around the
  whole string is not significant.
- Fractions are allowed and mean what they say: `'1.5s'` is fifteen hundred
  milliseconds, not one second.
- A positive value that is not a whole number of milliseconds is rounded **up**
  to the next millisecond. A duration is therefore never shortened by reading it,
  and a sub-millisecond value never becomes zero: `'0.4ms'` is 1 ms. Only an
  explicit `0` is zero.
- The longest duration the service accepts is 24 hours (`86400000` ms). Anything
  longer, and any negative value, is refused.
- A value that cannot be read at all throws a `RangeError` whose message begins
  `invalid duration`. A value that reads but is outside the permitted range
  throws a `RangeError` whose message begins `duration out of range`.

`parseSize(value)` reads a size the same way, in bytes:

| input | result |
|---|---|
| `512` | `512` |
| `'512b'` | `512` |
| `'1.5kb'` | `1536` |
| `'8kb'` | `8192` |
| `'2mb'` | `2097152` |
| `'1gb'` | `1073741824` |
| `'1.2b'` | `2` |
| `'1tb'`, `-5`, `null` | throws `RangeError` (`invalid size`) |
| `1073741825`, `'2gb'` | throws `RangeError` (`size out of range`) |

Sizes use the binary suffix — `b`, `kb`, `mb`, `gb`, each 1024 of the one below —
and round up to a whole byte the same way durations round up to a whole
millisecond. A bare number is bytes. The largest size the service accepts is
1 GiB (`1073741824`).

## 3. Writing a duration

`formatDuration(ms)` writes a duration back out, using the largest unit in which
the value is at least one and needs no more than one decimal digit — `h` first,
then `m`, `s`, `ms`. Nothing smaller than a second is ever written as a fraction
of one, and nothing is written with more precision than a tenth. The number is
plain decimal: no exponent, no trailing zeros, no trailing point. Zero is `'0ms'`.

| value | text | | value | text |
|---|---|---|---|---|
| `0` | `'0ms'` | | `60000` | `'1m'` |
| `1` | `'1ms'` | | `90000` | `'1.5m'` |
| `250` | `'250ms'` | | `3600000` | `'1h'` |
| `1000` | `'1s'` | | `5400000` | `'1.5h'` |
| `1500` | `'1.5s'` | | `86400000` | `'24h'` |

`1100` is `'1.1s'` and `2500` is `'2.5s'`, but `250` stays `'250ms'` and `999`
stays `'999ms'`: neither of those reaches one second, and neither is a whole tenth
of one either.

`formatSize(bytes)` is the same rule with `gb`, `mb`, `kb`, `b`: `512` is
`'512b'`, `1536` is `'1.5kb'`, `8192` is `'8kb'`, `2097152` is `'2mb'`.

Both functions throw a `RangeError` for a value that is not a whole, in-range,
non-negative number.

Reading a duration back after writing it returns the value you started with:
`parseDuration(formatDuration(x)) === x` for every `x` in range. Reading a value
that was already text and writing it again normalises it: `'1.50s'` becomes
`'1.5s'`, `'2000ms'` becomes `'2s'`, `' 90 s '` becomes `'1.5m'`.

## 4. Whole seconds at the edge

Two operator-facing numbers are published in whole seconds, by `stats()` and by
the report. The rounding direction is part of the contract, and the two
directions are not the same:

- a **lifetime** is published rounded **up** — the shortest whole second that is
  not shorter than the lifetime. A TTL of 1400 ms is published as `2`; a TTL of
  300000 ms as `300`. A lifetime is never published as shorter than it is.
- a **threshold** is published rounded **down** — the longest whole second that
  is not longer than the threshold. A slow threshold of 2500 ms is published as
  `2`; a threshold of 2000 ms as `2`. A threshold is never published as more
  tolerant than it is.

The published fields are `cache.stats().ttlSeconds` (a lifetime) and
`log.stats().slowSeconds` (a threshold).

## 5. The modules

Every module takes and returns canonical values, and says so in the field name: a
name ending in `Ms` is integer milliseconds, a name ending in `Bytes` is integer
bytes.

| module | options | rules |
|---|---|---|
| `HttpClient` | `timeoutMs`, `baseUrl` | `attempt({ path, responseMs })` reports `status: 'timeout'` when `responseMs > timeoutMs`. A response exactly equal to the timeout is not a timeout. |
| `RetryPolicy` | `attempts`, `baseBackoffMs`, `maxBackoffMs`, `budgetMs` | `backoffMs(n)` is `0` for `n <= 0`; for `n >= 1` it is `min(baseBackoffMs * 2 ** (n - 1), maxBackoffMs)`, so the first retry waits exactly `baseBackoffMs`. A budget is wall time and the waits between attempts are wall time too: `n` attempts cost `n * perAttemptTimeoutMs + backoffMs(1) + … + backoffMs(n - 1)`, the first attempt carrying no wait before it. `schedule({ perAttemptTimeoutMs, spentMs })` allows the largest number of attempts, never more than the configured `attempts`, whose cost fits in `budgetMs - spentMs`; `totalMs` is that cost, and one attempt more would not have fitted. When not even one fits, `attempts` is 0, `allowed` is false and `reason` is `'budget'`. |
| `Cache` | `ttlMs`, `maxEntries` | every call takes `nowMs`. An entry is live while `nowMs - storedAtMs < ttlMs`; at exactly `ttlMs` it has expired. Over `maxEntries`, the entry stored longest ago is dropped. |
| `RateLimiter` | `limit`, `windowMs` | `take(nowMs)` opens a window at the first request after a reset, and a request arriving exactly `windowMs` after the window opened starts a new one. At most `limit` requests are allowed per window; `remaining` is what is left after this request. |
| `Histogram` | `bucketsMs` | `observe(durationMs)` counts one observation and adds it to `sumMs`. `snapshot()` returns `{ count, sumMs, buckets }`, where each bucket is `{ leMs, count }` and its count is cumulative: every observation less than or equal to `leMs`. An observation above the last bound is in `count` and `sumMs` only. |
| `LogWriter` | `slowMs`, `maxRecordBytes` | `write(record, durationMs)` returns `{ line, bytes, slow, tooLarge }`: `line` is the record as JSON, `bytes` is the length of that line in UTF-8 bytes, `slow` is `durationMs >= slowMs`, `tooLarge` is `bytes > maxRecordBytes`. |
| `Scheduler` | `tickMs` | ticks happen at `0`, `tickMs`, `2 * tickMs`, …; `ticksUntil(horizonMs)` returns each tick that is strictly below the horizon. |

### Time is passed in

Nothing in the service reads a clock. Every call that depends on time takes
`nowMs`, in milliseconds. Two calls with the same `nowMs` see the same world.

### A planner is built, not shared

`createService()` returns a new planner on every call. Each one reads the
configuration again and owns its own cache, limiter, histogram, log writer and
scheduler: nothing is shared between two planners, and nothing one of them has
done — an observation, a cached entry, a request counted against the window — can
change what the next one is built from. Two planners made from the same
configuration are indistinguishable, however much work the first one did.

## 6. The report

`renderReport(service)` returns one `key: value` line per field, in this order,
joined with a newline:

```
client.timeout: <formatDuration(client.timeoutMs)>
retry.attempts: <retry.attempts>
retry.budget: <formatDuration(retry.budgetMs)>
cache.ttl: <formatDuration(cache.ttlMs)>
cache.ttlSeconds: <cache.stats().ttlSeconds>
limiter.window: <formatDuration(limiter.windowMs)>
metrics.buckets: <formatDuration of each bucket, joined with ', '>
log.slow: <formatDuration(log.slowMs)>
log.slowSeconds: <log.stats().slowSeconds>
log.maxRecord: <formatSize(log.maxRecordBytes)>
scheduler.tick: <formatDuration(scheduler.tickMs)>
```
