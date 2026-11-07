# Background: the two ISBN forms

Notes the cataloguing team circulated when the library was first written. The
binding rules are in `isbn-rules.md` and `hyphenation.md`; this file is the
"why" behind them.

## Where the forms come from

The ISBN-10 is the original 1970 format: nine digits of identifier plus one
check digit, computed with weights running from ten down to two so that any
single-digit error or transposition changes the remainder mod 11.

Since 2007 every ISBN is thirteen digits: the EAN product code of the book
trade. The first three digits — the Bookland prefix — are 978 or 979, and the
check digit is the EAN one: alternating weights 1 and 3, mod 10, the same as a
supermarket barcode.

## Why conversion is asymmetric

Every ISBN-10 has an ISBN-13 form under 978, because the 978 space was carved
out for exactly the numbers that already existed. The 979 space was opened
later for new assignments and overlaps nothing, so a 979 ISBN-13 has no
ISBN-10 equivalent — there is no ten-digit number to convert it to. The
importer treats "979 converted to ISBN-10" as a data error, never as a number.

Converting either way drops the old check digit and computes a fresh one for
the new form. The two check schemes agree only by coincidence, so a converted
ISBN almost never keeps its last digit.

## The parts of a hyphenated ISBN

After the prefix, an ISBN-13 is read as four variable-length elements:

- the **group** element identifies a language or country area; groups 0 and 1
  are the English-language areas and are the only ones the site displays,
- the **registrant** element identifies the publisher, and is longer for small
  publishers and shorter for large ones — that is what the table in
  `hyphenation.md` encodes,
- the **publication** element identifies the title within the publisher,
- the **check** digit.

Because the elements are variable-length, hyphenation cannot be guessed from
the number's shape; it comes out of the range table and nothing else.
