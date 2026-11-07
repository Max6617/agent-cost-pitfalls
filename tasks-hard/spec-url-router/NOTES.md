# spec-url-router

**stratum:** spec-implementation
**prompt:** "Requests are landing on the wrong handler: when two patterns could both serve a path, the router picks one that the routing spec under docs/ would not. A parameter carrying an escaped slash swallows the segment boundary, an escaped character comes back decoded twice, and adding or dropping a trailing slash decides which route wins. Make the router behave the way docs/routing-spec.md says it does; the reproductions under test/ are the ones we managed to write down, not the whole acceptance criteria."

The contract is `fixture/docs/routing-spec.md`: pattern syntax with an escaping
rule, normalisation of both sides, the specificity-vector precedence table,
decoding-after-matching, the query/fragment rules, the exact result shape, and
the method table. The fixture is a router that deviates from it in seven
modules, with no comment anywhere naming a defect.

## Sub-problems (one hidden file each)

| file | sub-problem | the deviation in the fixture |
|---|---|---|
| `01-matching` | literals, one-segment parameters, the case option | `router.js` defaults `caseSensitive` to **false** and folds the whole path, so captured values are lower-cased too; `normalize.js` percent-decodes the whole path **before** splitting it, so `%2F` becomes a separator |
| `02-wildcards` | `*name`, `**name`, pattern validation | `match.js` lets `*name` swallow every remaining segment and makes `**name` require at least one; `pattern.js` never validates, so `**` mid-pattern, `*` without a name and repeated names are all accepted |
| `03-precedence` | specificity vector, leftmost-first, ties | `precedence.js` scores a pattern by its **number of literal segments** and lets the **last** candidate win a tie |
| `04-optionals` | optional groups, empty segments, slashes | `match.js` can only skip an optional group at the end of a pattern (no backtracking); `normalize.js` collapses nothing: duplicate slashes stay, a trailing slash stays, and a path that does not start with `/` is refused outright |
| `05-decoding` | decode once, `+`, malformed escapes, query keys | `decode.js` swallows malformed escapes and treats `+` as a space in path segments; `parseQuery` leaves keys encoded and keeps only the last value of a repeated key |
| `06-results` | result shape, miss shape, fragment, methods | `router.js` reports a miss without `path` and `query`; `normalize.js` strips the fragment **after** the query string, so `#f?x=1` yields a query; `methods.js` files and looks up methods as written and has no HEAD fallback |

Seven source files change in the reference: `src/{normalize,decode,pattern,match,precedence,methods,router}.js`.
No single edit fixes more than one file's cases.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 6/16 pass, exit 1 (9 cases fail) | **3/25 = 12%** |
| reference | 16/16 pass, exit 0 | **25/25 = 100%** |
| partial: visible-green with a naive specificity heuristic | 16/16 pass, exit 0 | **17/25 = 68%** |

The partial was built by starting from the reference and re-introducing the
rules the visible suite cannot see (wildcard arity, escape processing, query key
decoding, the miss shape, fragment order, the method table) plus a literal-count
specificity score. It keeps the visible suite green, which is the point:
greening `test/` lands well short of 100%, and the gap is made of rules that are
written down only in the spec. A stronger partial — the same six rules, but with
the correct specificity vector and backtracking optionals — measures 19/25 = 76%.

Which hidden file a module's fix is load-bearing for (measured by reverting one
reference file at a time from an otherwise correct tree; the mixed trees are
proxies, not solutions):

| reverted | hidden cases that move |
|---|---|
| `match.js` | 9 — wildcard/catch-all arity, both optional cases, the leftmost-position case, the trailing-slash case, the escaped-marker case, the case-folding case |
| `precedence.js` | 4 — leftmost position, wildcard-vs-catch-all, the exact tie, and the HEAD tie |
| `router.js` | 4 — both case-option cases, the malformed-escape case, the miss shape |
| `pattern.js` | 3 — catch-all position/names, escaped markers, duplicate-slash patterns |
| `decode.js` | 3 — `+`, malformed escapes, query keys and repeats |
| `methods.js` | 1 — method casing and the HEAD fallback |
| `normalize.js` | not measurable in isolation: the other modules call `readTarget`/`splitPath` by interface, so a mixed tree breaks on the contract rather than on behaviour |

## Interaction cases (8 of 25)

Each needs two sub-problems right at the same time:

- `01` `%2F` inside a parameter is data, and the deeper pattern must still not match — decoding × matching.
- `02` a catch-all's value is decoded per segment and joined with `/` — catch-all × decoding.
- `03` an escaped `\:` literal beats a parameter route — escaping × precedence.
- `03` `:p` and `{p}` consume the same segment the same way, so the tie falls to declaration order — optionals × precedence.
- `04` an optional group that participates outranks a catch-all — optionals × precedence.
- `04` a trailing slash makes `/users/:id` and `/users/**rest` compete for the same path — normalisation × precedence.
- `06` `/a/b#frag?x=1` has no query at all, while `/a/b?x=1#frag` does — fragment stripping × query handling.
- `06` a HEAD request is served by the GET table, and a HEAD route wins the tie — methods × precedence.

## Guards (pass on the untouched fixture, on purpose)

- `01` a literal segment plus a parameter capture their parts of the path.
- `03` a literal beats a parameter at the same position.
- `06` a matched result carries exactly the seven documented keys.

Three guards, a 12% floor. The other 22 cases fail before the fix: no case passes
by accident on the untouched fixture.

## Deviations from the brief, and why

- **The miss is a result, not a throw.** The spec pins both (only malformed
  input raises), but the fixture's *miss* behaviour is correct and the bug is in
  the miss's **shape** (`path`/`query` missing). If the fixture threw on a miss,
  every "this path must not match" assertion in sub-problems 1-5 would have
  depended on sub-problem 6 — coupling of the unhelpful kind.
- **25 cases, not 24.** `03-precedence` carries five, because the precedence
  table needs a case a naive heuristic also gets right (the guard) as well as
  the cases only leftmost-first gets right.
- **Documented-but-untested rules** (greedy optional resolution ahead of a
  catch-all, `?`/`#` refused in a pattern, `{x}y` staying literal): they are in
  the spec so the implementation has one story, but the suite does not spend a
  case on each.
- No clock, randomness, network, filesystem writes or `process.cwd()` anywhere;
  every hidden case builds its own `Router`, so the files can run in any order.
