# Colour rules

The notation rules design signed off. `src/` is the implementation; when the
two disagree, this document is right and the code is a bug.

## 1. Colour objects

A colour is a plain object:

```js
{ r: 255, g: 136, b: 0, a: 1 }
```

`r`, `g`, `b` are integer channels 0..255. `a` is a number 0..1; a colour with
`a === 1` is opaque. Every parser returns this shape, or `null` when the text
is not a colour.

Wherever the library rounds, it rounds **half up**: the value plus one half,
rounded down. 127.5 is 128. Rounding happens once per channel, at the point
the value becomes a channel.

## 2. Hex notation

Four lengths, no others: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`.

A short form is the long form with each nibble written once: **every digit is
duplicated**, so `#4fa` is `#44ffaa` and `#4fa8` is `#44ffaa88`. The alpha
digit is a nibble like any other: `#f808` and `#ff000088` are the same colour.

Digits are case-insensitive. A string of any other length, or with a digit
that is not hex, is refused.

## 3. rgb() and rgba()

Comma form only: `rgb(255, 136, 0)`, `rgba(255, 0, 0, 0.5)`. Whitespace around
the channels and commas is ignored; the function name is matched
case-insensitively; `rgba()` with three channels is just `rgb()`. The
space-and-slash form (`rgb(1 2 3 / 0.5)`) is **not** supported and is refused.

Each colour channel is one of:

- **an integer** — a whole number, clamped to 0..255: `rgb(300, -5, 12)` is
  `(255, 0, 12)`. A decimal point makes it not an integer channel:
  `rgb(1.5, 2, 3)` is refused.
- **a percentage** — a percentage **of 255**, clamped to 0..100, rounded half
  up: `rgb(0%, 75%, 100%)` is `(0, 191, 255)`. Decimals are allowed:
  `62.5%` is 159.

Integers and percentages may mix in one declaration: `rgb(255, 75%, 0)` is
`(255, 191, 0)`.

The alpha channel, when present, is a fraction 0..1 or a percentage, clamped:
`rgba(10, 20, 30, 2)` has alpha 1; `rgba(10, 20, 30, 25%)` has alpha 0.25.

## 4. hsl() and hsla()

`hsl(120, 100%, 50%)`, `hsla(240, 100%, 50%, 0.5)`. Same comma form, same
whitespace and case rules, same alpha rules as rgb().

- The **hue** is an angle in degrees: any real number, taken **modulo 360**.
  480° is 120°, and a negative angle wraps the same way: -120° is 240°.
  Fractional degrees are allowed. A hue with a unit (`120deg`) is refused.
- **Saturation and lightness are percentages** and must carry the % sign;
  `hsl(120, 1, 0.5)` is refused. Both clamp to 0..100.
- Conversion is the standard sector formula, and each channel rounds half up,
  once, at the end. `hsl(210, 50%, 60%)` is `(102, 153, 204)`;
  `hsl(0, 0%, 50%)` is `(128, 128, 128)`.

## 5. Named colours

The vocabulary is this table, matched case-insensitively. Any other word is
refused.

| name | channels | | name | channels |
|---|---|---|---|---|
| black | 0 0 0 | | cyan | 0 255 255 |
| white | 255 255 255 | | magenta | 255 0 255 |
| red | 255 0 0 | | orange | 255 165 0 |
| green | **0 128 0** | | purple | 128 0 128 |
| blue | 0 0 255 | | rebeccapurple | 102 51 153 |
| yellow | 255 255 0 | | tomato | 255 99 71 |

Note that `green` is the CSS value `(0, 128, 0)`, not `(0, 255, 0)` — that is
`lime`, which is not in the table.

## 6. Serialisation

`toHex` writes the canonical form: lowercase `#rrggbb` for an opaque colour.
The eight-digit `#rrggbbaa` form is used when - and only when - the colour is
not opaque, and its alpha byte is the alpha times 255, **rounded half up**. A
translucent colour keeps both alpha digits even when the rounded byte is `ff`.

Channels are rounded half up and clamped before they are written, so
`toHex({ r: 254.6, g: 0.4, b: 16, a: 1 })` is `#ff0010`.

## 7. parse()

`parse(text)` reads any of the above. Leading and trailing whitespace is
ignored; the notation is recognised from the shape of the text. A non-string,
an empty string, an unknown name, or malformed notation all return `null`.
Nothing is guessed.

## 8. Clamped versus refused

| input | outcome |
|---|---|
| integer channel out of range | clamped to 0..255 |
| percentage channel out of range | clamped to 0..100 |
| alpha out of range, any notation | clamped to 0..1 |
| saturation / lightness out of range | clamped to 0..100 |
| any hue, including negative and fractional | taken modulo 360 |
| wrong channel count | refused |
| non-numeric channel | refused |
| decimal point in an integer channel | refused |
| saturation / lightness without % | refused |
| hue with a unit | refused |
| space-separated channels | refused |
| hex of the wrong length or with a bad digit | refused |
| unknown name, empty text, non-string | refused |
