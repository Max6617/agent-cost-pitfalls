# repo-wide-text-truncation

stratum: repo-wide

One convention (docs/truncation-policy.md: code-point length, U+2026 ellipsis
counted inside the limit, limits from a central policy module, word-boundary
break within the last 10 code points) that five surface modules each implement
slightly wrong. The work is finding every deviant and sweeping them all onto
the shared truncator.

## sub-problems

1. `01-sms-codepoints` — `src/sms.js` counts and cuts in UTF-16 code units: astral characters weigh double and a cut can split a surrogate pair.
2. `02-push-ellipsis` — `src/push.js` marks the cut with `...` and counts it outside the limit (output can reach limit+3).
3. `03-email-limit` — `src/email.js` truncates against a hardcoded 50 instead of `LIMITS.emailSubject` (60).
4. `04-table-boundary` — `src/table.js` always cuts mid-word; the word-boundary rule is missing entirely.
5. `05-log-window` — `src/log.js` searches the whole kept prefix for a boundary instead of only the last 10 code points.
6. `06-interactions` — astral characters combined with the boundary window (sms/log/table), a boundary searched at the policy limit (email), boundary + ellipsis + astral (push).

## guards (pass on the untouched fixture)

- `02-push-ellipsis`: "a title at exactly the limit is sent whole"
- `04-table-boundary`: "with no boundary inside the window a cell breaks mid-word"
- `05-log-window`: "a boundary inside the last ten code points is honoured"

## interaction cases (5)

All of `06-interactions`: each case crosses two sub-problems at once
(astral x window for sms/log/table, policy-limit x boundary for email,
ellipsis x astral x boundary for push).

## measured

- untouched fixture: 3/25 hidden cases
- reference: 25/25 hidden cases
- visible suite: fails before (6 of 10 cases failing), passes after

Reference changes 5 files: `src/{sms,push,email,log,table}.js`, each routed
through `truncate(text, LIMITS.<key>)`.
