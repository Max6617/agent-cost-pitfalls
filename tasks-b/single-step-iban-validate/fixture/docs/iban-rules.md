# IBAN rules

The rules this library implements, as agreed with the payments team. Treat this
document as the contract: where the code and this document disagree, the code
is wrong.

## 1. Two formats

An IBAN exists in two formats:

- the **electronic form** — the canonical form: country code, check digits and
  BBAN concatenated with no whitespace, letters uppercase. Example:
  `DE44500105175407324931`.
- the **printable form** — the form humans read on statements and invoices:
  the electronic form split into groups of four characters, joined by single
  spaces. Example: `DE44 5001 0517 5407 3249 31`.

An IBAN is always: two letters of country code, two check digits, then the
BBAN.

## 2. Normalisation comes first

IBANs arrive as users type or paste them: lowercase, with statement spacing,
with stray tabs or newlines. **Case and whitespace are insignificant.** Every
public function that takes an IBAN or a BBAN normalises its input before any
other rule is applied:

1. remove every whitespace character (spaces, tabs, newlines),
2. uppercase every letter.

The result is the electronic form. All further rules operate on it.

## 3. Countries and lengths

We cover exactly eight countries. The length is the total length of the
electronic form, country code and check digits included.

| country | length | | country | length |
|---|---|---|---|---|
| BE | 16 | | GB | 22 |
| CH | 21 | | IT | 27 |
| DE | 22 | | NL | 18 |
| ES | 24 | | FR | 27 |

A country code outside this table is simply unknown; there is no partial
support.

**This library does not inspect the internal structure of a BBAN** (bank code,
branch, account number). It checks the character set and the total length only.
After normalisation every character of the IBAN must be in `A-Z` or `0-9`.

## 4. The mod-97 checksum

Validity of the check digits is decided by the mod-97 rule:

1. Take the electronic form. Move the four leading characters (country code
   and check digits) to the end.
2. Expand each letter to two digits, A = 10, B = 11, ..., Z = 35. Digits pass
   through unchanged. The result is the *numeric form*, a string of decimal
   digits.
3. The IBAN is valid iff the numeric form, read as an integer, leaves
   remainder **1** modulo 97.

Worked example — `NL20INGB0001234567`:

```
rearranged:  INGB0001234567NL20
numeric:     182316110001234567232120
182316110001234567232120 mod 97 = 1   -> valid
```

The numeric form is 18-30 digits for the countries we cover — beyond what a
binary double holds exactly. Compute the residue **incrementally**: reduce
modulo 97 as you walk the digits, so the running value never exceeds a few
hundred. Folding the whole string into one integer first and reducing at the
end is not an option.

## 5. Generating an IBAN from a BBAN

Given a country code and a BBAN (normalised per §2):

1. Form the draft: country code, then `00`, then the BBAN.
2. Compute the numeric form of the draft (§4: move the head to the tail,
   expand letters) and take its residue mod 97.
3. The check value is `98 - residue`. It is **always written as two digits,
   zero-padded**: a check value of 6 is written `06`.
4. The IBAN is country code, then the two check digits, then the BBAN.

Worked example — DE, BBAN `500105175407324936`:

```
draft:       DE00500105175407324936
rearranged:  500105175407324936DE00
numeric:     500105175407324936131400
numeric mod 97 = 92   -> check = 98 - 92 = 6 -> "06"
IBAN:        DE06500105175407324936
```

Generation refuses (returns null) when the country is not in the table, or
when the normalised BBAN contains characters outside `A-Z0-9` or is not
exactly `length - 4` characters long for that country.

## 6. The printable form

The printable form is the electronic form split into groups of four characters
**from the left**, joined by single spaces. The final group has one to four
characters and is kept exactly as it is — never padded, **never dropped**. A
22-character IBAN prints as five groups of four and a group of two:
`DE44 5001 0517 5407 3249 31`. A 16-character IBAN prints as exactly four
groups: `BE68 5390 0754 7034`.

## 7. The verdict of `validate`

`validate(input)` normalises its input (§2), then applies the rules in this
order; the first failure wins:

| order | rule | reason |
|---|---|---|
| 1 | every character is `A-Z` or `0-9` | `bad-character` |
| 2 | the first two characters are letters and name a country in the table | `unknown-country` |
| 3 | the total length matches the country's length | `bad-length` |
| 4 | the mod-97 residue is 1 | `bad-checksum` |

An empty input has no country code, so it fails as `unknown-country`.

On success the verdict is `{ ok: true, iban, country }` where `iban` is the
canonical electronic form and `country` the two-letter code. On failure it is
`{ ok: false, reason }` with a reason from the table. `isValid(input)` is the
boolean projection of `validate`.

## Appendix A. Known-good test vectors

Every IBAN below satisfies all the rules above, in both formats.

| electronic | printable |
|---|---|
| `BE68539007547034` | `BE68 5390 0754 7034` |
| `CH9300762011623852957` | `CH93 0076 2011 6238 5295 7` |
| `DE44500105175407324931` | `DE44 5001 0517 5407 3249 31` |
| `DE06500105175407324936` | `DE06 5001 0517 5407 3249 36` |
| `ES9121000418450200051332` | `ES91 2100 0418 4502 0005 1332` |
| `FR1420041010050500013M02606` | `FR14 2004 1010 0505 0001 3M02 606` |
| `GB29NWBK60161331926819` | `GB29 NWBK 6016 1331 9268 19` |
| `IT60X0542811101000000123456` | `IT60 X054 2811 1010 0000 0123 456` |
| `NL91ABNA0417164300` | `NL91 ABNA 0417 1643 00` |
| `NL20INGB0001234567` | `NL20 INGB 0001 2345 67` |
