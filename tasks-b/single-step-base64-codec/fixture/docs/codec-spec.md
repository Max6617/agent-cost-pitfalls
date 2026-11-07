# Codec spec

The behaviour we agreed the codec has. `src/` is the implementation; when the
two disagree, this document is right and the code is a bug.

Terms: a **quantum** is four base64 characters carrying three bytes. A
**partial quantum** is two or three characters carrying one or two bytes, and
it may only ever come last.

## 1. Alphabets

Two alphabets, from RFC 4648:

- `standard` (the default): `A–Z a–z 0–9` then `+` for 62 and `/` for 63.
- `url` (RFC 4648 §5): the same sixty-four values, but 62 is written `-` and
  63 is written `_`. This is the alphabet for tokens that travel in URLs and
  filenames.

The `alphabet` option selects the alphabet for both encoding and decoding, and
it selects the *only* legal data characters when decoding: a character that
exists only in the other alphabet — `+` or `/` in `url` input, `-` or `_` in
`standard` input — is an invalid character, in every mode. The alphabets are
not mixed.

## 2. Encoding

`encodeBytes(bytes, options)` and `encodeString(text, options)` produce base64
text. `encodeString` encodes its argument as UTF-8 first, so any Unicode
string round-trips.

Every byte of the input contributes to the output, including the final
one- or two-byte group: a one-byte remainder produces two characters, a
two-byte remainder produces three.

`options.padding` is `'required'` (the default) or `'none'`:

- `'required'` — each partial quantum is filled out to four characters with
  `=`: one byte produces `xx==`, two bytes produce `xxx=`.
- `'none'` — the `=` is omitted: one byte produces `xx`, two bytes `xxx`.

The empty input encodes to the empty string.

## 3. Decoding modes

`decodeToBytes(text, options)` and `decodeToString(text, options)` accept an
`options.mode` of `'strict'` (the default) or `'lenient'`.

**Strict** input is exactly what the encoder produces with
`padding: 'required'`:

- the length is a whole number of quanta — a partial final quantum means the
  padding was stripped, which is an error;
- `=` appears only as the final one or two characters, exactly as §2 says the
  encoder emits it;
- no whitespace anywhere.

**Lenient** input is what other systems hand us:

- padding is optional — with it or without it, the same bytes come out;
- whitespace may appear anywhere and is skipped. Whitespace means exactly the
  four characters space, tab, carriage return and line feed.

Whether strict or lenient, an input whose length (after whitespace is skipped)
is one more than a whole number of quanta — length ≡ 1 (mod 4) — is never
decodable. A dangling single character such as `'A'` carries four bits, and
four bits is not a byte; this is an error in every mode, never silently
decoded.

## 4. Errors

Malformed input raises `CodecError` (exported from `src/index.js`).

- A **character-level** problem — a character outside the selected alphabet,
  or whitespace in strict mode — names where it happened: the error's `offset`
  is the index into the input string exactly as the caller passed it, before
  any whitespace is skipped.
- A **structural** problem — ragged length, a dangling single character,
  misplaced or excessive `=` — has no single guilty character, so `offset`
  is `null`.

Character problems are reported before structural ones: the scan reads the
input left to right, and the first invalid character stops it.

## 5. Byte fidelity

`decodeToBytes(encodeBytes(bytes))` is `bytes`, for every byte value 0–255, in
either alphabet. Binary data must survive the round trip exactly — a byte that
happens to encode to `-` or `_` is not special once decoded.

`decodeToString` decodes the bytes as UTF-8. It is for text; binary belongs
with the byte functions.

## 6. Worked examples

| input | operation | result |
|---|---|---|
| `'Man'` | `encodeString` | `'TWFu'` |
| `'A'` | `encodeString` | `'QQ=='` |
| `'AB'` | `encodeString` | `'QUJ='` |
| `'TWFu'` | `decodeToString` | `'Man'` |
| `'QQ'` lenient | `decodeToString` | `'A'` |
| `'QUJ'` lenient | `decodeToString` | `'AB'` |
| `[0xfb, 0xff, 0xfe]` | `encodeBytes` | `'+//+'` |
| `[0xfb, 0xff, 0xfe]` | `encodeBytes`, url | `'-__-'` |
| `'-__-'`, url | `decodeToBytes` | `[0xfb, 0xff, 0xfe]` |
