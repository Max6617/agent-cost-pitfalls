# single-step-quoted-printable

stratum: single-step

prompt: "The gateway mangled another message body last week and the quoted-printable codec is taking the blame. Receivers report that our encoded output ships lines longer than the 76 columns the docs promise, and that blanks at the end of a line go out raw unless the line happens to be the last one. Incoming mail is no better: the decoder refuses escapes written with lowercase hex, and a body whose encoded form ends in a bare '=' picks up a stray character. Make the codec behave the way docs/quoted-printable.md says it does; the tests under test/ are the reproductions we managed to write, not the whole acceptance criteria."

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-escapes` | `=XX` uppercase-hex escapes; printable passthrough; escape width vs the wrap column | no bug here on purpose — the file carries three of the four guards; its one discriminator fails through the wrap off-by-one |
| `02-trailing-whitespace` | blanks at end of an emitted line MUST be encoded, whole run, every line | `encoder.js` escapes the trailing blank run only on the final segment of the input |
| `03-line-wrapping` | soft breaks keep lines ≤ 76 columns including the break's `=` (content ≤ 75); a blank on the wrap column is encoded in place if it fits, carried if not | `wrap.js` packs to 76 columns of content, so folded lines ship at 77; it has no end-of-line blank handling at all |
| `04-decoding` | decode takes either hex case; every soft-break form (`=\n`, `=\r\n`, bare `=` at EOF) is dropped; CRLF normalises; a stray `=` is literal | `charset.js` `isHexDigit` accepts only `0-9A-F`, so lowercase escapes pass through undecoded; `decoder.js` has no branch for `=` as the last character of the input, so it survives as a stray character |
| `05-roundtrip` | `decode(encode(x)) === x` incl. tabs and non-ASCII, with the encoded form still inside the line rules | fails through the encode-side bugs (raw trailing blanks, 77-column folds) |

Four modules change in the reference: `src/{charset,wrap,encoder,decoder}.js`.
`src/index.js` and `src/bytes.js` are clean; the wrap bug sits behind a module
the prompt never names.

## guards (the 4 cases that pass on the untouched fixture)

- `01` *printable ASCII passes through unchanged*
- `01` *escapes are two uppercase hex digits, for control, high and multibyte input*
- `01` *blanks in the middle of a line pass through raw, both ways*
- `04` *an '=' that begins neither an escape nor a soft break stands for itself* —
  guards against an over-strict rewrite that starts rejecting malformed escapes

## interaction cases (8)

- `01` escape crossing the wrap column moves whole to the next line (escapes × wrap)
- `02` trailing blank run long enough to wrap stays encoded across the folds (trailing blanks × wrap)
- `03` an escape that would end exactly one column past the limit moves (wrap × escape width)
- `03` blank on the wrap column carried to the next line, encoded (wrap × trailing blanks, carry branch)
- `03` blank on the wrap column encoded in place when it fits (wrap × trailing blanks, in-place branch)
- `04` every soft-break form disappears — CRLF, LF and bare EOF `=` in one input
- `05` round trip survives a fold placed next to a multibyte character (wrap × UTF-8)
- `05` longer mixed document: round trip + line rules (trailing blanks × wrap × non-ASCII)

## measured

- untouched fixture: 4/24 hidden cases (17%); visible suite 6/10 pass, exit 1 (4 failing cases)
- reference: 24/24 hidden cases (100%); visible suite 10/10 pass, exit 0
- gate: `node tasks-b/_tools/verify-task.mjs single-step-quoted-printable` prints `ok`
- fixture shape: 13 text files, 397 lines; reference changes 4 files

Naive-vs-correct: a solution that greens the visible suite (final-line trailing
blanks, fold at 75, lowercase hex, EOF `=`) but misses the wrap-column blank
handling and the "input ends with a newline" trailing-blank trap lands around
20/24; the in-place/carry distinction in `03` is the subtle end of the suite.
