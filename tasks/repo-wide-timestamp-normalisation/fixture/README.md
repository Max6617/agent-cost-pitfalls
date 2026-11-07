# audit-service

| module | responsibility |
|---|---|
| `src/timestamps.js` | the one timestamp format |
| `src/audit.js` | append-only audit log |
| `src/sessions.js` | session start/end and durations |
| `src/ratewindow.js` | rate-limit windows |
| `src/report.js` | export rows and summaries |

## Timestamps

One format, everywhere: `2026-03-04T05:06:07.000Z` — UTC, milliseconds, literal
`Z`. That is what is stored, what is sent to clients and what appears in an
export.

Parsing accepts that form and the second-precision variant `...:07Z`. It does
**not** accept an offset form such as `+01:00` or a local-time string: those are
converted silently by `Date`, which is exactly how a local-time bug reaches
production.

`toTimestamp` is the only thing that renders an instant, and `parseTimestamp`
the only thing that reads one. A module that calls `toISOString`, `toUTCString`
or `toLocaleString` directly is a module that will drift — the audit log and the
report export disagreed about the same event for a month before anyone noticed.
