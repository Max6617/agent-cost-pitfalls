# Authorization rules

The rules the platform team agreed before this service was written. `src/` is the
implementation; where the two disagree, this document is right and the code is a
bug.

## 1. The graph

A policy is four flat lists — subjects, groups, roles and rules. Ids are unique
across the whole document: a group and a role may not share an id.

| node | may point at |
|---|---|
| subject | `groups`, `roles` |
| group | `groups` (parent groups), `roles` |
| role | `roles` (inherited roles) |
| rule | exactly one `role` |

`A -> B` means *A holds everything B holds*: a group that lists another group in
`groups` holds that group's roles, and a role that lists another role in `roles`
holds everything that role holds. A subject that lists a group in `groups` is a
member of it, and a subject that lists a role in `roles` holds it directly.

Nothing is directional the other way. A parent group does not hold the roles of
the groups that point at it, and a rule bound to a role is held only by subjects
that hold that role.

## 2. Effective roles

The **effective roles** of a subject are every role reachable from it by
following those arrows, at any depth, in any combination: subject to group, group
to parent group, group to role, role to inherited role.

- Inheritance is transitive and **not** depth-limited. A role four parents away
  counts exactly as much as a role bound directly to the subject, and a group
  nested six deep is walked all the way down.
- A role reachable by two different routes is held once. A diamond — two groups
  that share a parent, or two roles that inherit the same role — must not lose
  the roles on either side of it.
- `effectiveRoles(subject)` returns them as a plain array in ascending id order.
- The groups and roles a subject holds by inheritance are inherited by nobody
  else: two subjects in the same group are independently resolved.

### Cycles

A cycle is a configuration error: a group that contains itself, directly or
through other groups and roles, or a role that inherits itself the same way.

Resolution is what finds it. Building an engine over a document that contains a
cycle succeeds — the cycle only matters when a resolution reaches it, and a
cycle sitting in a branch that the subject cannot reach does not affect that
subject's decisions at all.

When a resolution does reach a cycle it throws an `AuthzError` with:

- `code === 'cycle'`
- `cycle`: the ids along the cycle, **starting and ending with the same id**, for
  example `['g-support', 'g-escalation', 'g-support']`. Which id the list starts
  at is not fixed; the repetition at both ends is.

Neither `authorize()` nor `effectiveRoles()` may hang, truncate the walk, or
answer from a partially resolved role set.

## 3. Rules

A rule binds one effect to one action on one resource pattern, for one role:

```js
{ id: 'p-101', role: 'r-reader', effect: 'allow', action: 'project.read', resource: 'project/*' }
```

`effect` is `'allow'` or `'deny'`. An absent `effect` means `'allow'`.

The **candidate rules** for a decision are the rules bound to any role in the
subject's effective role set. A rule bound to a role the subject does not hold is
not a candidate, however close that role is to the subject.

`action` matches by exact string equality. There is no wildcard syntax in
`action`; `project.*` is a literal action name that no caller sends.

### Resource patterns

A resource is a `/`-separated path: `project/42/secret` has three segments. A
resource is never empty and never contains an empty segment.

A pattern is matched **segment by segment against the whole resource**:

- A literal segment matches that segment and only that segment. Comparison is
  exact and case-sensitive: `Project/42` and `project/42` are different
  resources, and `org/acme` does not cover `org/acmex`.
- `*` matches **exactly one** segment. It never matches zero segments and never
  more than one.
- `**` matches **any number** of segments, including zero.
- The two are not interchangeable: `project/*` does not cover
  `project/42/secret`, and `**/secret` does cover `secret`.
- A pattern must account for every segment of the resource. A pattern is never a
  string prefix, a substring or a path prefix of the resource: `project/42` does
  not cover `project/421`, and it does not cover `project/42/secret` either.

## 4. Precedence

Of the candidate rules whose pattern covers the resource:

1. If **any** of them is a `deny`, the decision is deny. An explicit deny
   outranks every grant, at any distance from the subject, whatever the order the
   rules are declared in and whatever their ids are.
2. Otherwise, if at least one is an `allow`, the decision is allow.
3. Otherwise nothing matched: the decision is deny, and it is not attributed to
   any rule.

A deny that covers one resource does not touch another: a `deny` on
`project/prod/legacy` leaves `project/prod/app` alone.

## 5. The decision

`authorize(subjectId, action, resource)` returns one object:

```js
{
  allowed: true,                       // boolean
  effect: 'allow',                     // 'allow' | 'deny'; allowed === (effect === 'allow')
  rule: 'p-101',                       // the id of the rule that decided it, or null
  path: ['u-anna', 'g-platform', 'r-reader', 'p-101'],
  reason: 'allowed',                   // 'allowed' | 'explicit-deny' | 'no-matching-rule'
}
```

The object and the decision are one thing and must agree with each other:

- `reason` is `'allowed'` when a grant decided it, `'explicit-deny'` when a deny
  did, and `'no-matching-rule'` when nothing matched.
- `rule` is null **if and only if** `reason` is `'no-matching-rule'`, and `path`
  is an empty array in exactly that case.
- An `'explicit-deny'` never names a grant. The `rule` reported is always the
  rule that produced the verdict, never a rule that was merely looked at.

### The path

`path` is the route from the subject to the deciding rule, node by node, with the
subject first and the rule id last. Every consecutive pair in it is an arrow that
exists in the graph: subject to group, group to parent group, group to role, role
to inherited role, role to rule.

When a rule can be reached by more than one route the reported path is **the
shortest one**; if several routes are equally short, the one whose sequence of
ids sorts first.

An unknown subject id is a caller error rather than a decision: `authorize()`
and `effectiveRoles()` throw an `AuthzError` with `code === 'unknown-subject'`.
An unknown action or resource is not an error — it simply matches nothing.

## 6. Caching

Decisions are cached. The cache key is the **exact** triple of subject, action
and resource: no case folding, no trimming, no truncation, and no key that leaves
the resource out. `project/42`, `project/421` and `Project/42` are three
different questions with three different answers.

Any edit to the graph invalidates what the cache holds. After `grant()`,
`revoke()`, `addMember()` or `removeMember()` the next `authorize()` for any
triple must reflect the new graph — an allow that outlives the role it came from
is the worst bug this service can have.

`stats()` reports `{ decisions, cacheHits, cacheSize }`: the number of
`authorize()` calls, how many of those were served from the cache, and how many
entries the cache holds. A repeated question with no edit in between is served
from the cache and counted as a hit; a question the cache cannot answer is not.

## 7. Editing

```js
engine.grant(rule)                  // add a rule, or replace the rule with that id
engine.revoke(ruleId)               // remove a rule; a no-op if it is not there
engine.addMember(subjectId, groupId)    // add a group membership
engine.removeMember(subjectId, groupId) // remove it; a no-op if it is not there
```

Edits are applied to the engine's own copy of the document — the object passed to
`createEngine()` is never modified — and every edit takes effect on the very next
decision.
