# feature-flags

| module | responsibility |
|---|---|
| `src/flags.js` | the definitions |
| `src/bucketing.js` | placing a subject in a rollout bucket |
| `src/evaluate.js` | precedence and evaluation |
| `src/audit.js` | who changed what |
| `src/admin.js` | the write path |

## Evaluation order

1. an override for this subject
2. the flag definition
3. off — an unknown flag is off

## Rollouts

A rollout is a **stable bucket**, not a coin flip. The subject is hashed together
with the flag name, so:

- the same subject always gets the same answer for the same flag
- two different flags roll out to different subsets of users

That second property is not cosmetic. Hashing the subject alone meant one 25%
rollout and another 25% rollout selected exactly the same users, and two
experiments ran on top of each other without anyone noticing.
