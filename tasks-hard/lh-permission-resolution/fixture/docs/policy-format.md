# Policy document format

The policy of record is `data/policy.json`; the same shape is what
`createEngine(document)` accepts and what the console writes back after an
operator edits a role.

```json
{
  "version": 3,
  "subjects": [
    { "id": "u-anna", "name": "Anna Reyes", "groups": ["g-platform"], "roles": [] }
  ],
  "groups": [
    { "id": "g-platform", "name": "Platform", "groups": ["g-engineering"], "roles": ["r-deployer"] }
  ],
  "roles": [
    { "id": "r-deployer", "name": "Deployer", "roles": ["r-operator"] }
  ],
  "rules": [
    { "id": "p-102", "role": "r-operator", "effect": "allow", "action": "project.deploy", "resource": "project/*" }
  ]
}
```

| field | required | notes |
|---|---|---|
| `subjects[].id` | yes | unique across the whole document |
| `subjects[].groups` | no | group ids the subject is a member of |
| `subjects[].roles` | no | role ids held directly |
| `groups[].groups` | no | parent groups this group inherits from |
| `groups[].roles` | no | roles this group confers |
| `roles[].roles` | no | roles this role inherits |
| `rules[].role` | yes | the single role the rule is bound to |
| `rules[].effect` | no | `"allow"` (default) or `"deny"` |
| `rules[].action` | yes | exact action name |
| `rules[].resource` | yes | resource pattern, see `docs/authorization-rules.md` |

Notes:

- A missing list is an empty list. A node with no outgoing arrows is legal.
- An arrow to an id that is not in the document is ignored rather than fatal: the
  console can leave a dangling reference behind while an operator is mid-edit.
- `name` is carried for the console and plays no part in a decision.
- Ids are opaque strings. Nothing in the service parses them, and no ordering is
  implied by their spelling — the `p-` / `r-` / `g-` / `u-` prefixes are a
  convention the console writes, not a rule the service relies on.

The actions the platform currently sends:

```
project.read      project.deploy     project.delete
audit.read        audit.export
org.manage
```
