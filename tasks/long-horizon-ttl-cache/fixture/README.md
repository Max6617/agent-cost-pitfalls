# response cache

Wraps the upstream client so repeated identical requests do not leave the
process.

## Limits

| limit | meaning |
|---|---|
| `maxSize` | maximum number of live entries. Exceeding it drops the least recently **used** entry and counts an eviction. |
| `ttlMs` | how long an entry may be returned. An entry past its ttl is never returned, and stops counting against `maxSize` as soon as it is noticed — counted as an expiration, not an eviction. |

## Recency

"Used" means read or written.

- `get(key)` counts as a use and promotes the entry.
- `has(key)` does **not** count as a use. The request path calls `has()` as a
  pre-flight check on every request, including ones it then sends upstream;
  when `has()` promoted entries the cache degenerated into a
  most-recently-used cache and the hit rate roughly halved.

## Statistics

`stats()` reports `size`, `hits`, `misses`, `evictions` and `expirations`.
Evictions and expirations are different events and are never merged: the first
means the cache was too small, the second means the ttl was too short, and they
are tuned by different people.

A `get()` for a missing key is a miss whether the key was never stored or its
entry had expired.
