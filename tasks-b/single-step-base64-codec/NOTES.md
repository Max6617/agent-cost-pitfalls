# single-step-base64-codec

stratum: single-step

A base64/base64url codec for strings and byte arrays. The written contract is
`fixture/docs/codec-spec.md`; the bugs are all deviations from it.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-alphabet` | standard vs url-safe alphabets | `src/alphabets.js` builds the url decode table correctly, then an IIFE "re-applies" the RFC 4648 §5 mapping with 62 and 63 transposed, so `-` decodes as 63 and `_` as 62 |
| `02-padding-length` | padding required in strict mode; length ≡ 1 (mod 4) is never decodable | `src/padding.js` strict branch checks `rem > 1`, so a dangling single character (`'A'`, `'AAAAA'`) slips through strict mode and is decoded into a garbage byte instead of raising `CodecError` |
| `03-unpadded-lenient` | lenient decode of unpadded input: 2 chars → 1 byte, 3 chars → 2 | `src/quanta.js` `decodeTail` folds the second sextet in with `>> 2` instead of `>> 4`, so the first byte of every partial quantum is misaligned (`'QQ'` decodes to `'D'`) |
| `04-encode` | every input byte contributes to the output, in both padding modes | `src/encode.js` handles only the 2-byte remainder (`rem === 2`), silently dropping a trailing single byte (`'a'` encodes to `''`) |
| `05-errors-roundtrip` | error offsets name the input as passed; binary-safe round trips | no bug here — this file holds two guards and the binary/utf-8 round-trip cases that catch the bugs above from the other end |

The prompt hints at three symptom areas (url-safe, unpadded, trailing bytes);
the `padding.js` length-check bug sits behind a module the prompt does not
point at.

## guards (4 cases that pass on the untouched fixture)

- *a single dangling character is rejected in lenient mode too* — the lenient
  branch of the length check is correct; guards against an over-fix that makes
  lenient reject legal partial quanta
- *strict mode accepts unpadded input when no padding was needed* — guards the
  whole-quantum decode path against rewrites that demand `=` everywhere
- *an invalid character names its offset in strict mode* — guards the
  `CodecError.offset` contract against validation rewrites
- *an invalid character names its offset in the input as passed, whitespace
  included* — same, through lenient whitespace skipping

## interactions (8 cases)

- `01`: unpadded url-safe tail keeping both punctuation values (alphabet × lenient tail)
- `03`: whitespace skipped before the partial quantum (whitespace × tail); url-safe partial quantum (alphabet × tail)
- `04`: single byte → url punctuation, unpadded (encode tail × alphabet × padding mode)
- `05`: lenient offset through skipped whitespace (behaviour the visible suite never touches); 0–255 binary round trip (binary × encode tail); url binary round trip (binary × alphabet); non-ascii utf-8 round trip (utf-8 × encode tail)

## measured

- untouched fixture: **4/21 hidden = 19%** (the 4 guards, nothing else);
  visible suite 5/11 pass, 6 fail (exit 1)
- reference: **21/21 hidden = 100%**; visible suite 11/11 pass (exit 0)
- reference changes 4 files: `src/{alphabets,encode,padding,quanta}.js`
- fixture: 15 text files, 553 lines

Gate: `node tasks-b/_tools/verify-task.mjs single-step-base64-codec` → `ok`.

## where partial credit comes from

The four bugs are independent modules, so each hidden file moves on its own.
The visible suite touches all four bugs, but only at their easiest input:
a fix that handles the 2-char tail but not the 3-char one, or the padded
1-byte remainder but not `padding: 'none'`, greens the visible suite and still
loses `03` and `04` cases. The foreign-alphabet rejection rule (a `+` in url
input is invalid in every mode) is specified in `docs/codec-spec.md` §1 but
deliberately untested — it stayed on the wrong side of the 4-guard budget.
