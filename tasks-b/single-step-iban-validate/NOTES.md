# single-step-iban-validate

stratum: single-step

An IBAN validation/formatting library per a simplified spec in
`fixture/docs/iban-rules.md`: eight countries with a length table, the mod-97
checksum, check-digit generation for building an IBAN from a BBAN,
printable/electronic format conversion, and case/whitespace normalisation.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-length` | per-country length table and check | `src/countries.js` lists GB as 21 (spec says 22), so full-length British IBANs fail the length check and short ones pass it |
| `02-checksum` | rearrange + letter expansion + mod-97 residue | `src/checksum.js` folds the 18-30 digit numeric form into one `Number` without reducing, so doubles lose precision and the residue is wrong for real-length IBANs |
| `03-build` | generating an IBAN from a BBAN | `src/build.js` writes the check value without zero-padding (`cc + check + body`), so a check below 10 yields a one-digit field and a too-short IBAN |
| `04-format` | printable vs electronic conversion | `src/util/text.js` `chunk()` loops while a *full* group remains, silently dropping the trailing 1-3 character group (the bug sits behind the formatter the prompt never mentions) |
| `05-validate` | end-to-end validation, normalisation first | `src/validate.js` strips whitespace but never raises case before the checksum (the country lookup uppercases its own copy - a half-fix), so lowercase valid IBANs fail as `bad-checksum` |

The reference changes 5 files: `src/countries.js`, `src/checksum.js`,
`src/build.js`, `src/util/text.js`, `src/validate.js`.

Coupling worth knowing: `03-build` imports the broken `mod97`, so its cases
only pass once `src/checksum.js` is fixed as well as the padding; and
`05-validate`'s "short British IBAN is bad-length" case needs the GB length fix
before the reason comes out right. Both are deliberate interactions.

## guards (pass on the untouched fixture, 4 of 22)

- `01-length` *a country outside the table has no spec* (`specFor('XX')`)
- `02-checksum` *the numeric form moves the head to the tail and expands letters*
- `02-checksum` *a single corrupted digit is caught* (broken mod-97 rejects
  everything, so the rejection case passes before and after)
- `04-format` *a 16-character IBAN prints as exactly four groups* (BE has no
  trailing partial group, so the dropped-remainder bug never shows)

## interaction cases (6 of 22)

- `03-build` *the country and the BBAN are normalised before building* (build x normalisation)
- `03-build` *a built IBAN round-trips through validation* (build x checksum x validate)
- `04-format` *lowercase input is normalised before grouping* (format x normalisation)
- `04-format` *the printed form converts back to a valid IBAN* (format x checksum x validate)
- `05-validate` *a lowercase printable IBAN validates* (normalisation x checksum)
- `05-validate` *mixed case and stray tabs or newlines are insignificant* (normalisation x checksum)

## measured

- untouched fixture: **4/22 = 18%** hidden cases (the 4 guards); visible suite
  4/10 pass, exit 1 (6 failing reproductions)
- reference: **22/22 = 100%** hidden; visible suite 10/10 pass, exit 0
- gate: `node tasks-b/_tools/verify-task.mjs single-step-iban-validate` prints `ok`

A solution that greens only the visible suite still misses: the NL20 letter
expansion is the only checksum case in sight, GB length is one table entry of
eight, and the dropped trailing group, the unpadded check digits and the
un-uppercased checksum input each have exactly one easy visible reproduction
against several hidden ones.
