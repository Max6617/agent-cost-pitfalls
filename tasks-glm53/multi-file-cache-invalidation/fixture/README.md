# product-feed

| module | responsibility |
|---|---|
| `src/feed.js` | turning rows into a feed |
| `src/cache.js` | ttl cache with an invalidation generation |
| `src/service.js` | read-through and write-invalidate |
| `src/reader.js` | the data seam |

## Invalidation

A cached feed is invalidated by time or by a write. Both paths go through
`cache.invalidate`, which also bumps a **generation** counter.

The generation is what makes invalidation correct under concurrency: a request
that started loading before the invalidation has already computed a value, and
its write must not resurrect the state that was just thrown away. A value
carries the generation it was computed at, and a write from an older generation
is discarded rather than stored.

## Serving

`service.read(key)` serves from the cache when the entry is fresh and loads
otherwise. Two concurrent reads of the same key must share a single load: the
reader is expensive and the second caller has no new information.
