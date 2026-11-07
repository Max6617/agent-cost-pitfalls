/**
 * URI parsing and normalisation.
 *
 * The split into components follows the generic syntax: scheme, authority
 * (userinfo / host / port), path, query and fragment. Normalisation is
 * deliberately conservative — only the transformations the syntax explicitly
 * permits, never a guess about what a server meant.
 *
 * `path` is stored WITH its leading separator and `rooted` records whether it
 * had one, so that a relative reference and an absolute path reference stay
 * distinguishable and every component set round-trips exactly.
 *
 * Everything in here is specified. Where this file and the specification
 * disagree, the specification is right and the tests will say so.
 */

const SCHEME_RE = /^([A-Za-z][A-Za-z0-9+.-]*):/

/** Percent-encoded octets that stand for an unreserved character. */
const UNRESERVED = /^[A-Za-z0-9\-._~]$/

/**
 * Split a URI reference into its components.
 *
 * @param {string} reference
 * @returns {{ scheme: string|null, authority: string|null, path: string,
 *             rooted: boolean, query: string|null, fragment: string|null }}
 */
export function parse(reference) {
  let rest = String(reference ?? '')
  let scheme = null
  let authority = null
  let query = null
  let fragment = null

  const hash = rest.indexOf('#')
  if (hash >= 0) {
    fragment = rest.slice(hash + 1)
    rest = rest.slice(0, hash)
  }
  const question = rest.indexOf('?')
  if (question >= 0) {
    query = rest.slice(question + 1)
    rest = rest.slice(0, question)
  }

  const schemeMatch = SCHEME_RE.exec(rest)
  if (schemeMatch) {
    scheme = schemeMatch[1]
    rest = rest.slice(schemeMatch[0].length)
  }

  if (rest.startsWith('//')) {
    const end = rest.indexOf('/', 2)
    authority = end < 0 ? rest.slice(2) : rest.slice(2, end)
    rest = end < 0 ? '' : rest.slice(end)
  }

  const rooted = rest.startsWith('/')
  return { scheme, authority, path: rest, rooted, query, fragment }
}

/**
 * Put the components back together.
 *
 * `path` is stored as it appeared in the reference, separator included, so a
 * URI of `mailto:a@b.c` does not become `mailto:/a@b.c` and `http://a` does not
 * become `http://a/`.
 */
export function recompose(parts) {
  let out = ''
  if (parts.scheme != null) out += parts.scheme + ':'
  if (parts.authority != null) out += '//' + parts.authority
  out += parts.path ?? ''
  if (parts.query != null) out += '?' + parts.query
  if (parts.fragment != null) out += '#' + parts.fragment
  return out
}

/**
 * Decode the octets that stand for unreserved characters.
 *
 * A percent-encoded octet is uppercase hex, and an octet that spells an
 * unreserved character may be written as that character instead. An octet that
 * spells a reserved character may NOT be decoded — doing so would change what
 * the URI means.
 */
export function normalizePercent(text) {
  return String(text).replace(/%([0-9A-Fa-f]{2})/g, (whole, hex) => {
    const char = String.fromCharCode(parseInt(hex, 16))
    return UNRESERVED.test(char) ? char : '%' + hex.toUpperCase()
  })
}

/** Lowercase the scheme and the host; a port that is the default goes away. */
export function normalizeAuthority(authority, scheme) {
  if (authority == null) return null
  const at = authority.lastIndexOf('@')
  const userinfo = at >= 0 ? authority.slice(0, at + 1) : ''
  let hostport = (at >= 0 ? authority.slice(at + 1) : authority).toLowerCase()
  if (scheme === 'http') hostport = hostport.replace(/:80$/, '')
  if (scheme === 'https') hostport = hostport.replace(/:443$/, '')
  return userinfo + hostport
}

/**
 * Remove `.` and `..` segments from a path.
 *
 * Only complete segments count: `..` inside a segment such as `a..b` is an
 * ordinary name. A `..` that would climb above the root is dropped, and a
 * trailing separator is preserved.
 */
export function removeDotSegments(path) {
  const text = String(path)
  if (text === '') return ''

  const rooted = text.startsWith('/')
  const trailing = text.endsWith('/') || text.endsWith('/.') || text.endsWith('/..')
  const segments = text.split('/')
  const out = []

  for (const segment of segments) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') {
      if (out.length) out.pop()
      continue
    }
    out.push(segment)
  }

  const body = out.join('/')
  const suffix = trailing && body !== '' ? '/' : ''
  return body + suffix
}
/** Normalise a URI reference without resolving it against anything. */
export function normalize(reference) {
  const parts = parse(reference)
  const scheme = parts.scheme == null ? null : parts.scheme.toLowerCase()
  return recompose({
    scheme,
    authority: normalizeAuthority(parts.authority, scheme),
    path: removeDotSegments(normalizePercent(parts.path)),
    query: parts.query == null ? null : normalizePercent(parts.query),
    fragment: parts.fragment == null ? null : normalizePercent(parts.fragment),
  })
}

/** Does this reference have a scheme? */
export function isAbsolute(reference) {
  return parse(reference).scheme != null
}
