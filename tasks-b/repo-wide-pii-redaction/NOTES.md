# repo-wide-pii-redaction

stratum: repo-wide

prompt: "Compliance is on us because raw emails and full card numbers are
turning up in the service logs, and the audit snapshots are somehow clobbering
the live records they capture - after we snapshot an account, the object we
handed in comes back with its email and phone replaced. Finance also noticed
the payment receipts show the wrong digits of the card. Every way an entity
leaves the process is supposed to follow the one redaction policy pinned in
docs/, so get all of them in line with it; the tests under test/ are the
reproductions we managed to write, not the whole acceptance criteria."

## sub-problems

ONE convention (docs/redaction-policy.md: listed fields masked `***`, email
`***@domain`, card `***` + last 4 digits, on all four surfaces, never
mutating, idempotent) that five modules each implement wrong in their own
way. The shared redactor (`src/redact.js`) is already correct; the work is
finding every deviant and sweeping it onto the policy.

| hidden file | sub-problem | the bug in the fixture | module |
|---|---|---|---|
| `01-logs` | log payloads redact on every level; the message is free text | `logging.js` stringifies the payload raw, never redacts | src/logging.js |
| `02-serializers` | API shapes mask exactly the listed fields, email keeps its domain as `***@domain` | `serializers.js` has a local email mask that drops the local part to nothing (`@domain`) instead of the pinned `***@domain` shape | src/serializers.js |
| `03-error-payloads` | error `details` redact like every other surface | `errors.js` passes `details` through unredacted | src/errors.js |
| `04-audit-snapshots` | a snapshot redacts the captured entity without touching or aliasing the source | `audit.js` scrubs the entity in place and returns the same object, clobbering the caller's record | src/audit.js |
| `05-card-masking` | receipts show `***` + last 4 digits, identical to every other surface | `payments.js` slices the FIRST four digits of the card number | src/payments.js |

The prompt hints at three symptoms (raw logs, clobbering snapshots, wrong
receipt digits); the email-shape divergence and the unredacted error payloads
are behind modules the prompt does not name.

## guards (pass on the untouched fixture; 4 of 22)

- `cardToJson keeps the brand and expiry and shows the last four` (02) - the
  fixture's serializers already share the correct card mask
- `the envelope keeps the code and message verbatim` (03) - free text was
  never the bug
- `the captured entity is masked the way the policy pins it` (04) - the
  fixture's audit output shape is correct; only its mutation is wrong
- `the audit metadata is carried verbatim` (04)

## interaction cases (8 of 22)

- `the message is carried verbatim even when it mentions an address` (01) -
  free-text-verbatim vs payload masking; the visible suite never touches
  free text
- `an error payload logged after it was built is still masked inside the
  line` (01) - errors x logs, and double-redaction idempotency
- `serializing an already-redacted account changes nothing` (02) -
  idempotency; discriminates because the fixture's local mask mangles the
  pinned shape
- `chargeToJson masks the account and card it carries...` (02) - nested
  kind-key recursion x email shape
- `a failed charge redacts the account and card it carries` (03) - errors x
  nested charge (a key that is not itself a kind name)
- `the snapshot shares no state with the source` (04) - aliasing, beyond the
  visible suite's plain no-mutation case
- `a charge snapshot masks what it carries without clobbering the
  original` (04) - audit x nested card
- `the same card masks to the same shape on every surface` (05) -
  serializers x logs x receipts cross-surface consistency

## measured

- untouched fixture: visible 1/10 pass (9 failing), hidden **4/22 = 18%**
  (exactly the four guards)
- reference: visible 10/10 pass, hidden **22/22 = 100%**
- gate: `node tasks-b/_tools/verify-task.mjs repo-wide-pii-redaction` -> ok

Reference changes 5 files: `src/{logging,serializers,errors,audit,payments}.js`.
The shared redactor and the policy data are untouched - every fix is a sweep
onto them (except payments, a one-token slice fix), which is the stratum's
point.
