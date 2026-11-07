# lh-permission-resolution

**stratum:** long-horizon
**prompt:** "Access is not being decided the way the platform team signed off. An
access review revoked a role and the subject kept working for the rest of the
day; people who reach a role through a group two levels up are told they have no
access at all; a deny aimed at one project does not stick, while a grant scoped
to a project leaks sideways onto its siblings and downwards into everything
nested under it. On top of that the console's "why was I denied?" panel cites a
rule that had nothing to do with the verdict and prints a route that does not
exist in the policy. Make the service behave the way docs/authorization-rules.md
says it does; the tests under test/ are the reproductions we managed to write,
not the whole acceptance criteria."

## Sub-problems (each its own hidden test file)

| file | cases | sub-problem | the bug in the fixture |
|---|---|---|---|
| `01-inheritance` | 4 | inheritance is transitive and depth-unlimited; a cycle is an error | `resolver.js` walks one group level and one role level, never recurses, and has no cycle detection at all |
| `02-deny-precedence` | 5 | an explicit deny beats every grant, at any distance | `decide.js` returns on the first matching rule in id order |
| `03-resource-scope` | 4 | a pattern is a whole-path scope, never a string prefix | `match.js` compiles to `^…` with no `$`, so every pattern is a prefix test |
| `04-wildcards` | 4 | `*` is exactly one segment, `**` is any number including zero | `match.js` compiles `**` to the same `[^/]+` as `*` |
| `05-explanation` | 4 | the report names the rule that decided it and a real route to it | `explain.js` reports `outcome.examined` (the last rule looked at) and invents `[subject, rule.role, rule.id]` as the path |
| `06-decision-cache` | 4 | the key is the exact triple; every edit invalidates | `cache.js` keys on subject+action only; `engine.js` invalidates on `grant()` but on no other edit path |

Six sub-problems on six modules, six reference files changed, no single edit
fixes the suite. `rules.js` (candidate selection, including exact action
matching) is correct in the fixture: an engine that ignored `action` would be a
seventh sub-problem and the brief has six.

## Interaction cases (8 of 25)

Cases that need two sub-problems right at the same time. Measured: on the
strongest partial arm that is still missing one sub-problem, **0 of these 8 are
green**; on the arm that fixes everything except `match.js`, 5 of 8 are green
and the other 3 are exactly the scope ones.

| case | needs | why the halves do not help alone |
|---|---|---|
| `01` a deny on the far side of a diamond still outranks a grant held directly | S1 + S2 | fixing resolution alone still returns the lower-id grant; fixing precedence alone never reaches the deny (it hangs off `r-y`, two hops down a diamond) |
| `02` a wildcard deny two groups away outranks a grant spelled out in full | S1 + S2 | the deny is bound to a role two group levels down, and the grant it beats is spelled out in full |
| `02` the same wildcard deny does not reach a segment below the one it names | S1 + S3 + S4 | the verdict is "nothing matched", which needs the deny found (S1), anchored (S3) and single-segment (S4) |
| `03` a deny on one resource does not outrank a grant that covers a deeper path | S2 + S3 + S4 | `project/42` denies while `project/**` grants; the deny carries the higher id, so first-match-wins gets it wrong, and `project` alone needs `**`=zero |
| `04` a deny written with one wildcard does not outrank a grant written with the other | S2 + S3 + S4 | `project/*` deny (higher id) vs `project/**` grant over three resources of different depth |
| `05` a deny two groups down is cited with the route that reaches it, never a grant | S1 + S5 | the path has to contain the two groups a shallow resolver never walks |
| `05` the route reported is the shortest one, not the first one the walk finds | S1 + S5 | two routes of different length reach the role; reporting the first one found is the natural wrong answer |
| `06` removing a membership that a role is nested under is gone from the next decision | S1 + S6 | the first decision needs the deep walk, the second needs the walk redone |

The other 14 cases are single-sub-problem mainline work, so a solution that
fixes half the modules still scores roughly half.

## Guards (pass on the untouched fixture on purpose) — 3

- `02` a deny aimed at another action or another resource leaves the grant alone
- `04` `*` is exactly one segment, never none and never more than one
- `06` a repeated question is a cache hit and a new grant is visible at once
  (this one also fails a solution that simply deletes the cache)

Floor: 3/25 = 12%.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 8/13 pass, exit 1 | **3/25 = 12%** |
| reference (6 files) | 13/13 pass, exit 0 | **25/25 = 100%** |

Partial overlays of `reference/src` onto the fixture (local calibration; each
row also shows how many of the 8 interaction cases it turns green):

| files overlaid | hidden | interactions |
|---|---|---|
| none | 3/25 = 12% | 0/8 |
| `cache.js` only | 4/25 = 16% | 0/8 |
| `resolver.js` only | 6/25 = 24% | 0/8 |
| `match.js` only | 7/25 = 28% | 0/8 |
| `resolver.js` + `match.js` | 10/25 = 40% | 0/8 |
| the four files the visible suite is about (`resolver`, `match`, `cache`, `engine`) | 13/25 = 52% | 1/8 |
| everything except `match.js` | 17/25 = 68% | 5/8 |

Greening the visible suite therefore lands at 52% with 1 of the 8 interaction
cases, and the top of the gradient is entirely interaction work. Reference
changes exactly: `src/cache.js`, `src/decide.js`, `src/engine.js`,
`src/explain.js`, `src/match.js`, `src/resolver.js`.

## Traps

- **A cycle must not hang.** A solver who writes the recursive walk without a
  stack set loops forever and takes the whole grader run down with it; the graph
  in `01` puts the cycle two levels below the subject so a walk of fixed depth
  never sees it at all.
- **The path is a choice.** `05`'s last case has two routes of different length
  to the same role; reporting the first one found is the natural wrong answer.
- **The cache is what makes the console lie.** With the broken key, the second
  question about a resource is answered from the first one's entry, so a
  solution that fixes matching and never touches the cache still looks right in
  the console.
- **`**` at the end of a pattern.** `project/**` has to match `project` itself;
  a fix that turns `**` into `[^/]+(?:/[^/]+)*` without making the tail optional
  gets the deep cases and misses the short one.
