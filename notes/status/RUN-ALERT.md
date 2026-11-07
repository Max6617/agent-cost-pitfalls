# RUN ALERT

Credit failures bill nothing - a 4xx costs no money - so the cost is time and
coverage, not spend. Completed runs are valid; only the failed tail is not.

| when | run | kind | detail | records |
|---|---|---|---|---|
| 2026-09-30T20:30:57.477Z | - | MEMORY | only 386 MB RAM free - the OS may kill a matrix | 0 |
| 2026-09-30T22:23:05.961Z | - | GATEWAY_DOWN | port 8792 (glm-flash) not answering | 0 |
| 2026-09-30T22:23:05.961Z | - | GATEWAY_DOWN | port 8793 (openai) not answering | 0 |
| 2026-10-01T00:42:20.107Z | haiku-full | CREDIT | Anthropic | 576 |

## What to do

- CREDIT: top up, then restart that matrix.
- MEMORY: stop one matrix before the OS picks one; lose the slowest.
- GATEWAY_DOWN: restart with scripts/start-provider.ps1 -Provider <name>.
- STALLED: the process is gone or wedged; check whether it finished.
