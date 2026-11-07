# Quoted-printable, as this gateway speaks it

A simplified RFC 2045 quoted-printable codec. These rules were agreed with the
mail team before the code existed; when `src/` and this document disagree, this
document is right and the code is a bug.

Text crosses the public surface as JavaScript strings. The encoder UTF-8-encodes
the string and then works on bytes; the decoder produces bytes and UTF-8-decodes
them.

## Line structure

- Lines in the encoded form are separated by a single LF (`\n`). The RFC asks
  for CRLF on the wire; the transport normalises to LF before a message reaches
  us, so this library speaks LF only.
- A hard break is a `\n` in the input. It is emitted as `\n`, never preceded by
  a soft-break `=`.
- A soft break is an `=` immediately followed by a line break. It marks where a
  long line was folded and carries no content of its own.

## Encoding

1. Bytes 33-60 and 62-126 — printable ASCII other than `=` — stand for
   themselves.
2. Space (0x20) and tab (0x09) stand for themselves, except as rule 4 requires.
3. Every other byte is written `=XX` with two uppercase hex digits: `=` itself
   (`=3D`), the control bytes (`=00` to `=1F` other than tab, and `=7F`), and
   every byte at or above 128 — which is how non-ASCII text travels (`é` is
   `=C3=A9`).
4. A space or tab that would be the last character of an emitted line MUST be
   encoded (`=20` / `=09`) — transport eats trailing blanks. This applies to
   every emitted line: one closed by a hard break and one closed by a soft
   break alike. The whole trailing run is encoded, not only its final blank
   (`x  ` at the end of a line is `x=20=20`). If encoding the blank would push
   the line past its column limit, the blank moves to the next line instead
   and is encoded there.
5. No emitted line is longer than 76 characters, and the `=` of a soft break
   counts toward the 76: a line that has more content coming carries at most
   75 characters of content and is closed with `=` in column 76, followed by
   `\n`. Lines are filled as full as these rules allow before a break is
   taken. A soft break never falls inside an escape sequence: if the next
   `=XX` does not fit whole, the break goes before it.
6. The encoder writes the shortest permitted form: nothing is encoded that the
   rules do not force. A `\r` in the input is an ordinary byte (rule 3), so
   the encoder never emits a raw CR.

Work these against the implementation:

| input | encoded form |
|---|---|
| `Hello, world!` | `Hello, world!` |
| `2+2=4` | `2+2=3D4` |
| `é` | `=C3=A9` |
| `a` followed by a space, at end of line | `a=20` |
| 76 `x` characters | 75 `x`, then `=\n`, then one `x` |

`decode(encode(x)) === x` for every string `x` — tabs, trailing blanks and
non-ASCII text included.

## Decoding

The decoder is lenient: senders vary, and a message that is slightly off-spec
is still delivered.

1. `=XX`, two hex digits in either case, is the byte. Lowercase and uppercase
   decode identically: `=c3=a9` and `=C3=A9` are both `é`.
2. `=` followed by `\n`, `=` followed by `\r\n`, or `=` standing as the last
   character of the input is a soft break: it is dropped, line break included,
   and the line continues.
3. Any other `\n` or `\r\n` is a hard break and is emitted as `\n` (CRLF
   normalises to LF).
4. Everything else stands for itself, byte for byte — including an `=` that
   begins neither an escape nor a soft break (`100%= sure` decodes to itself)
   and a blank that happens to sit at the end of a line.
