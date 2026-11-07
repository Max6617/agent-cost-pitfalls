# multi-file-locale-fallback

stratum: multi-file

An i18n message service: locale fallback chains (`fr-CA` -> `fr` -> `en`),
plural categories (zero/one/other per a docs-pinned table), `{name}`
interpolation with a per-mode missing-value policy, bundles as data modules
with per-key child-overrides-parent merges, and a missing-key policy that
differs between strict and lenient modes. The contract is
`fixture/docs/messages-rules.md`.

## sub-problems

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-fallback` | fallback chains walk every parent before the default | `src/locales.js` `fallbackChain` builds `[tag, default]`, skipping the middle of the chain (`fr-CA` -> `['fr-CA','en']`) |
| `02-plurals` | plural category per the docs table; fr selects `one` at n = 0 | `src/plurals.js` has the en rule copy-pasted for fr (`n === 1`), so the fr boundary is wrong for 0 |
| `03-interpolate` | missing value: lenient blanks, strict throws `MissingValueError` | `src/interpolate.js` leaves the raw `{name}` in the output in both modes (the imported error and the `mode` option are never used) |
| `04-missing-key` | missing key: lenient echoes, strict throws `MissingKeyError` naming key + requested locale | `src/service.js` `#missing` echoes the key in both modes; strict never throws |
| `05-bundles` | effective bundle = whole chain merged least-specific-first, child wins per key | no bug of its own; it exposes the `01` chain bug through the merged view |

Four modules change (`locales.js`, `plurals.js`, `interpolate.js`,
`service.js`); `bundles.js`, `errors.js` and the data modules are correct as
shipped. `errors.js` defines both policy errors up front - the fixture imports
them and never throws them, which is the tell.

## guards (pass on the untouched fixture, 4)

- `a lookup in the default locale renders its own text` (01)
- `an explicit zero form wins whenever n is zero` (02)
- `placeholders are filled and values are stringified` (03)
- `lenient mode echoes the missing key` (04)

## interactions (two sub-problems at once, or behaviour the visible suite never touches)

- `a three-part tag sheds one segment at a time` (01) - `zh-Hant-TW` chain of four
- `a requested locale with no bundle of its own falls through to its parents` (01) - unregistered chain links
- `a region never changes the plural rule of its language` (02) - plural rule x locale parsing
- `a regional locale renders the parent language plural forms by its rule` (02) - fallback x plurals
- `a message without an other form renders when the selected category exists` (02) - plural category x missing policy
- `the policy applies to a message that arrived through the fallback chain` (03) - interpolation x fallback
- `the error names the key and the requested locale, not the fallback` (04) - missing-key x requested-vs-resolved locale
- `a key the parent language defines is not missing for the regional locale` (04) - missing-key x fallback
- `the effective bundle merges the whole chain and the child wins per key` (05) - merge direction x middle link
- `the effective bundle of an unregistered locale still includes its parents` (05)
- `the default locale is configurable and ends every chain` (05) - chain x custom default

## measured

- untouched fixture: visible 4/10 pass (exit 1, 6 failing), hidden **4/23 = 17%**
- reference: visible 10/10 pass (exit 0), hidden **23/23 = 100%**
- fixture shape: 20 text files, 484 lines
- reference changes 4 files: `src/{locales,plurals,interpolate,service}.js`

Gate: `node tasks-b/_tools/verify-task.mjs multi-file-locale-fallback` -> `ok`
(also `PASS` under `node tools/validate-tasks.mjs --dir tasks-b`).

## where partial credit comes from

The visible suite touches all four bugs, so greening it requires a real fix,
but the easy fix still leaves points on the table: a chain builder that only
handles two-part tags fails the `zh-Hant-TW` case; an interpolate fix that
only handles strict leaves the lenient-blank case; a strict-missing throw
that names the resolved locale instead of the requested one fails the
error-message case; and nothing in the visible suite exercises unregistered
chain links, the custom default locale, or the `fr-CA`-uses-`fr`-rule plural
cases.
