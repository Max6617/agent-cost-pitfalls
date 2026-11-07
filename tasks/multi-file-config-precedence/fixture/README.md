# ingest-agent

Pulls batch files off the drop directories, validates them and publishes a
manifest record per batch. The configuration loader is the fiddly part; it is
documented here because support keeps asking.

## Configuration layers

Lowest precedence first:

| # | layer | where it comes from |
|---|---|---|
| 1 | defaults | `src/defaults.js`, shipped with the image |
| 2 | config file | `--config <path>`; missing file is fine, malformed is fatal |
| 3 | environment | `INGEST_PORT`, `INGEST_ORIGIN`, `INGEST_TOPIC`, `INGEST_ORIGINS`, `INGEST_LABELS`, `INGEST_SECRETS` |
| 4 | programmatic options | what the CLI passes through — `port`, `host`, `origins`, `labels` |

A higher layer wins key by key. Plain objects merge recursively, so setting only
`limits.maxInflight` in a config file leaves `maxBatchBytes` alone.

**`origins` is additive.** Every layer that sets it contributes its entries, and
the effective list is the defaults followed by each layer's entries in layer
order, de-duplicated. This is intentional: an operator can add a watch directory
from the command line without editing the config file.

`origin` (singular) is never settable from the command line. The CLI passes
`--host` and the loader derives `https://<host>` from it.

## Secrets

Anything under `secrets`, at any depth, is replaced with `***` by
`publicConfig()`. Nested secret material — a per-origin key, for example — must
not reach the log.
