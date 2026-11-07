# Routing spec

The routing contract the framework and its users agreed on. `src/` is an
implementation of this document; where the two disagree, this document is the
specification and the code is a defect.

The router owns one job: given a request method and a request target, choose the
one route that serves it and hand back the values that were captured on the way.

## 1. Patterns

A pattern is a path template. It is split on `/` into **segments**; each segment
is one of the following.

| written as | kind | what it matches |
|---|---|---|
| `users` | literal | exactly that segment, textually |
| `:id` | parameter | exactly one segment, captured under the name `id` |
| `*name` | wildcard | exactly one segment, captured under the name `name` |
| `**name` | catch-all | zero or more segments, captured under the name `name` |
| `{id}` | optional parameter | one segment when one is available, otherwise nothing; captured under the name `id` when it participates |

A name is an identifier: `[A-Za-z_][A-Za-z0-9_]*`. Every `:`, `*` and `**`
segment must carry one, and a name may be declared **only once** in a pattern.

Two constraints on the catch-all:

- `**name` is only legal as the **last** segment of a pattern.
- `**name` matches **zero or more** segments, so `/files/**rest` matches both
  `/files` and `/files/a/b/c`. When it matched no segment at all its captured
  value is the empty string.

A parameter, wildcard or optional parameter always matches exactly one whole
segment. A pattern matches the **whole** path — there is no prefix matching, and
a pattern never matches a path with more segments than the pattern itself can
consume.

### 1.1 Escaping

A backslash makes the next character ordinary text:

| in a pattern | means |
|---|---|
| `\:now` | the literal segment `:now`, not a parameter |
| `\*star` | the literal segment `*star`, not a wildcard |
| `\{id\}` | the literal segment `{id}`, not an optional group |
| `\?`, `\#` | literal `?` and `#` |
| `\\` | a literal backslash |

No other escape is defined: a backslash in front of anything else, including a
`/`, and a backslash at the very end of a pattern, are invalid patterns.

An **unescaped** `?` or `#` is also invalid in a pattern — a pattern is a path,
not a request target, and the router will never match a `?` or `#` as literal
path text.

Braces are optional syntax only when they wrap the entire segment: a segment
that begins with `{` and ends with `}` is an optional parameter and its content
must be a name. `{x}y` and `a{x}` are ordinary literal segments.

### 1.2 Registering

```js
const router = new Router()
router.add('GET', '/users/:id', handler)
```

`add(method, pattern, handler)` registers one route and returns its record:

```js
{ method: 'GET', pattern: '/users/:id', handler, order: 0 }
```

`method` is upper-cased, `order` is the zero-based index of the `add` call
across the whole router, and `pattern` is the pattern **as written** (the
normalised form used for matching is not what is reported back).

An invalid pattern is refused at registration time with a `RouteError`; a
pattern that is refused never becomes a route and never matches anything.

## 2. Normalisation

Every pattern and every request target is normalised before it takes part in
matching. Normalisation is the same on both sides, so a pattern and a request
that differ only in the ways below are the same path. (Steps 1 and 2 peel a
request target apart; a pattern carrying an unescaped `?` or `#` is refused at
registration instead — section 1.1.)

1. **The fragment is removed first**, at the first `#`; everything from there on
   belongs to no part of the request the router sees.
2. **The query string is removed next**, at the first `?` in what is left. It is
   kept separately, and it never takes part in matching.
3. A path that does not begin with `/` is treated as if it did: `users/42` and
   `/users/42` are the same path.
4. A run of two or more `/` is a single `/`.
5. A trailing `/` is ignored, except that the root path stays `/`. `/users/42/`
   and `/users/42` are the same path.

The matched path is `[]` segments (the root) or the normalised path split on `/`
with the leading `/` removed.

## 3. Matching

A pattern matches a path when its segments can consume the path segments in
order, under the rules in section 1.

An optional parameter is resolved **greedily from the left**: it takes a
segment whenever the segments that follow it can still be matched, and is
skipped when they cannot. It therefore participates whenever the pattern can
absorb one more segment, and `/a/{b}/**rest` matches `/a/x` with `b = 'x'` and
`rest = ''`.

## 4. Precedence

Several routes may match one target. Exactly one wins, and it is the one whose
**specificity vector** is greatest, compared position by position from the left.

The specificity vector of a candidate has one entry per segment of the
**normalised path** — that is, one entry per segment the candidate actually
consumed. The entry is the rank of the pattern element that consumed it:

| consumed by | rank |
|---|---|
| a literal segment | 3 |
| a parameter, or an optional parameter that participated | 2 |
| a wildcard (`*name`) | 1 |
| a catch-all (`**name`) | 0 |

Comparison is **leftmost first**: walk both vectors from index 0 and the first
index at which the ranks differ decides the winner; the higher rank wins. Ranks
to the right of that index are never consulted.

Two candidates whose vectors are equal — including two patterns that consume the
same segments with the same kinds, such as `/a/:p` and `/a/{p}` — are separated
by **declaration order**: the route registered first wins.

Consequences worth stating, because they are the cases people get wrong:

| competing patterns, for the path `/a/b/c` | winner | why |
|---|---|---|
| `/a/b/c` vs `/a/:p/c` | `/a/b/c` | index 1: `3 > 2` |
| `/a/:p/c` vs `/a/*w/c` | `/a/:p/c` | index 1: `2 > 1` |
| `/a/*w/c` vs `/a/**r` | `/a/*w/c` | index 1: `1 > 0` |
| `/a/b/:z` vs `/a/:p/:q` | `/a/b/:z` | index 1: `3 > 2` |
| `/:p/b/c` vs `/a/:q/:r`, path `/a/b/c` | `/a/:q/:r` | index 0: `3 > 2` — the leftmost position decides, not the number of literal segments |
| `/a/**r` vs `/a`, path `/a` | declaration order | both consume one literal segment, so both vectors are `[3]` |

## 5. Captured values and decoding

Percent-decoding is applied to **captured values and to query keys and values
only**, and it happens **after** matching.

- The path is split on `/` **before** any decoding, so a percent-encoded slash
  (`%2F`) inside a segment is data: it is part of the captured value and it is
  never a segment separator.
- Every captured value is decoded **exactly once**. `%2520` decodes to the text
  `%20`, not to a space.
- A catch-all that consumed several segments decodes each of them once and joins
  them with `/`, the separator that was there in the raw path.
- In a **path** segment, `+` is an ordinary plus sign; it never means a space.
- In a **query string**, `+` is a space, as it is on the wire.

### 5.1 Malformed escapes

A `%` that is not followed by two hexadecimal digits, or a run of escapes that
is not valid UTF-8, is malformed. A target containing a malformed escape in its
path or its query string is **rejected**: `match()` throws a
`MalformedEscapeError`, and its `raw` property carries the offending text — the
`%`, the two characters that follow it (fewer when the value ends there), or,
when every escape is well formed but the run is not valid UTF-8, the whole run.
The check happens before matching, so a malformed escape is still an error when
no route would have matched anyway; `/q/%ZZ` raises with `raw === '%ZZ'`, and
`?x=%` raises with `raw === '%'`.

The fragment was removed before this point (section 2), so a malformed escape
inside a fragment is not part of the request and is not an error.

## 6. Query strings

The query string is everything after the first `?` and before the fragment. It
never affects which route matches, and it is reported on the result as a plain
object of decoded keys and values.

- `a=1&b=2` is `{ a: '1', b: '2' }`.
- A key with no `=` is present with the value `''`: `?a&b=` is `{ a: '', b: '' }`.
- A key that appears more than once keeps **every** value, in the order they
  appear, as an array: `?tag=x&tag=y` is `{ tag: ['x', 'y'] }`. A key that
  appears once is a plain string, never a one-element array.
- No query string at all, including an empty one (`?`), is `{}`.

## 7. The result

`match(method, target)` returns a plain object with exactly these keys, whether
or not a route matched:

| key | value |
|---|---|
| `matched` | `true` when a route won |
| `method` | the upper-cased method |
| `path` | the normalised path, query and fragment removed |
| `pattern` | the winning route's pattern as written, or `null` |
| `handler` | the winning route's handler, or `null` |
| `params` | the captured values by name, `{}` when nothing was captured |
| `query` | the parsed query string, `{}` when there was none |

A name that did not participate in the match — an optional parameter that was
skipped — is **not a key** of `params`; it is not present with the value
`undefined`.

A request that matches no route is **not an error**. `match()` returns the same
shape with `matched: false`, `pattern: null`, `handler: null` and an empty
`params`, and it still reports the normalised path and the query it parsed. The
router throws only for malformed input (section 5.1).

Two calls to `match()` never share a `params` or `query` object.

## 8. Methods

The method is case-insensitive on both sides: `add('get', ...)` and
`match('get', ...)` mean `GET`.

A route is only a candidate for its own method, with one exception: a **HEAD**
request is served by `GET` routes when no HEAD route matches. The candidate list
for HEAD is the HEAD routes followed by the GET routes, in registration order,
and the declaration-order tie-break of section 4 is the position in that list —
so a HEAD route that ties with a GET route wins.

## 9. Options

```js
new Router({ caseSensitive: false })
```

- `caseSensitive` defaults to `true`: literal segments are compared exactly.
- With `caseSensitive: false`, literal segments are compared case-insensitively.
  Nothing else changes: parameters, wildcards and query values keep the case
  they arrived with.

```js
import { Router, RouteError, MalformedEscapeError } from './src/index.js'
```
