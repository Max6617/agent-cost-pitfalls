# Legacy sources

The archive's 17th- and 18th-century ledgers predate the subtractive
convention. They write values additively, with over-runs a modern writer
never uses:

| inscription | value | canonical |
|---|---|---|
| IIII | 4 | IV |
| VIIII | 9 | IX |
| XXXX | 40 | XL |
| LXXXX | 90 | XC |
| CCCC | 400 | CD |
| DCCCC | 900 | CM |

These inscriptions are real data and must keep importing: that is what
`mode: 'lenient'` is for. But even these sources never wrote a smaller symbol
to the left of a larger one, and never doubled V, L or D - so lenient mode
must not start accepting either today.

Every imported inscription goes through `canonicalize` before it is stored,
so the archive holds canonical forms only.
