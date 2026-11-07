# api-gateway

Content negotiation for one endpoint with three representations and four
locales.

## Accept

`Accept` is a weighted list of media ranges:

```
Accept: text/html, application/xhtml+xml;q=0.9, */*;q=0.1
```

The rules that matter:

- a range may use `*` in either position, and a concrete type is more specific
  than a wildcard
- `q` is the quality, defaulting to 1, with at most three decimals
- `q=0` means **not acceptable** — it must never be chosen, even when it is the
  only entry that matches
- ties on quality are broken by specificity, then by the order the client wrote
  them in

When the client expresses no usable preference the gateway serves
`application/json` and records `negotiated: false`.

## Parsing tolerance

An element the gateway cannot parse is dropped, not fatal: serving the default
representation is better than returning 400 to a client whose header was merely
sloppy. What matters is that a dropped element must not change the choice among
the elements that did parse.

## Accept-Language

Parsed the same way. A tag that is not in the supported list falls back to its
primary subtag when one is supported (`de-AT` → `de-DE`), and `*` means the
default locale.
