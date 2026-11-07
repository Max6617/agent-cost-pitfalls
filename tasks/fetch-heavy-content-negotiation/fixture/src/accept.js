/**
 * Accept header parsing.
 *
 * A weighted list: comma-separated media ranges, each with optional parameters,
 * one of which may be `q` — the quality, a number between 0 and 1 with at most
 * three decimal places. The quality defaults to 1 and is NOT part of the media
 * type, which matters when two ranges are compared.
 *
 * Real clients send all sorts: an empty element, a bare `q=`, quoted parameter
 * values, `q=0.5.5`. A header we cannot make sense of is not a 500 — the caller
 * falls back to a default representation.
 */

/** Token characters, per the HTTP grammar. */
const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

/**
 * Parse a single media range.
 *
 * @param {string} text
 * @returns {{ type: string, subtype: string, params: Record<string,string>,
 *             q: number, order: number }|null}
 */
export function parseMediaRange(text, order = 0) {
  const parts = splitParams(String(text ?? '').trim())
  if (!parts.length) return null

  const [media, ...params] = parts
  const slash = media.indexOf('/')
  if (slash < 0) return null

  // A range carrying parameters is a detail this gateway does not serve.
  if (params.length) return null

  const type = media.slice(0, slash).trim().toLowerCase()
  const subtype = media.slice(slash + 1).trim().toLowerCase()
  if (!TOKEN.test(type) && type !== '*') return null
  if (!TOKEN.test(subtype) && subtype !== '*') return null

  const parsed = {}
  let q = 1
  for (const param of params) {
    const eq = param.indexOf('=')
    if (eq < 0) continue
    const key = param.slice(0, eq).trim().toLowerCase()
    let value = param.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1)
    if (key === 'q') {
      const quality = Number(value)
      if (!Number.isFinite(quality) || quality < 0 || quality > 1) return null
      q = quality
      continue
    }
    parsed[key] = value
  }

  return { type, subtype, params: parsed, q, order }
}

/** Split on `;`, but not inside a quoted string. */
export function splitParams(text) {
  const out = []
  let current = ''
  let quoted = false

  for (const char of text) {
    if (char === '"') quoted = !quoted
    if (char === ';' && !quoted) {
      out.push(current)
      current = ''
      continue
    }
    current += char
  }
  out.push(current)

  return out.map((s) => s.trim()).filter((s) => s !== '')
}

/**
 * Parse a whole header.
 *
 * An element we cannot parse is dropped rather than failing the request: the
 * gateway would rather serve the default representation than a 400.
 *
 * @param {string|undefined|null} header
 */
export function parseAccept(header) {
  if (header == null) return []
  return String(header)
    .split(',')
    .map((element, index) => parseMediaRange(element, index))
    .filter(Boolean)
}

/** How well does `range` match `offer`? 0 means it does not. */
export function matchScore(range, offer) {
  const [offerType, offerSubtype] = String(offer).toLowerCase().split('/')
  if (range.type !== '*' && range.type !== offerType) return 0
  if (range.subtype !== '*' && range.subtype !== offerSubtype) return 0
  // A concrete type is more specific than a wildcard. The exact match scores
  // highest so that a client listing both gets what it asked for first.
  if (range.type === '*' && range.subtype === '*') return 1
  return 2
}

/**
 * Choose the best offer for a header, or null when none is acceptable.
 *
 * Highest quality wins; ties are broken by specificity and then by the order
 * the client listed them. An entry with `q=0` means "not acceptable" and must
 * never be chosen.
 *
 * @param {string|undefined|null} header
 * @param {string[]} offers
 */
export function bestMatch(header, offers) {
  const ranges = parseAccept(header)
  let best = null

  for (const offer of offers) {
    for (const range of ranges) {
      const score = matchScore(range, offer)
      if (!score) continue
      const candidate = { offer, q: range.q, score, order: range.order }
      if (!best || better(candidate, best)) best = candidate
    }
  }

  return best ? { offer: best.offer, q: best.q } : null
}

/** Is `a` a better choice than `b`? */
export function better(a, b) {
  if (a.q !== b.q) return a.q > b.q
  if (a.score !== b.score) return a.score > b.score
  return a.order < b.order
}

/** The `Accept` list, rendered for the debug endpoint. */
export function summarise(header) {
  return parseAccept(header).map((r) => r.type + '/' + r.subtype + ';q=' + r.q)
}
