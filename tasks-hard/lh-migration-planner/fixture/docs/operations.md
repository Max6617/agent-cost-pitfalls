# Operation catalogue

The operations the ticket export may name, and what the planner knows about
each. A kind is matched case-insensitively (see `planning-rules.md` section 1).

| kind | table | destructive | notes |
|---|---|---|---|
| `add-column` | yes | no | nullable column with a default; instant on modern engines |
| `rename-column` | yes | no | metadata only |
| `create-index` | yes | no | built concurrently, no write lock held |
| `add-constraint` | yes | no | validated afterwards, not while the lock is held |
| `backfill` | yes | no | the one operation that is batched; see section 6 |
| `analyze` | no | no | refreshes planner statistics for the whole database |
| `create-extension` | no | no | database-level, no table to prepare |
| `drop-column` | yes | **yes** | the data is gone; the rollback plan cannot bring it back |
| `drop-table` | yes | **yes** | as above, plus every index and constraint on it |
| `rewrite-type` | yes | **yes** | rewrites every row of the table while holding the lock |

A destructive operation is one the rollback plan cannot undo. It needs an
acknowledgement before it is planned (section 5), and it is always listed in the
plan's warnings so the release notes can carry it.

`create-extension` and `analyze` name no table: they prepare nothing per table,
they are never batched, and so they hold no lock window of their own.
