import { parse, recompose, normalize, removeDotSegments, normalizePercent, normalizeAuthority } from './uri.js'

/**
 * Reference resolution.
 *
 * Producing an absolute URI from a base and a possibly relative reference is
 * the one algorithm every HTTP client has to implement, and the one they most
 * often get subtly wrong: a reference that carries only a fragment, one that
 * carries only a query, a network-path reference (`//host/path`), and the
 * difference between a path that is absolute and one that only looks like it.
 *
 * The webhook client must refuse a reference it cannot resolve rather than
 * inventing a base for it.
 */

/**
 * Merge a relative path against the base path.
 *
 * The base path's last segment is dropped; a reference with no path of its own
 * therefore resolves to the base directory. The result keeps the base's
 * rootedness, so a relative reference never turns into an absolute path.
 */
export function mergePaths(base, reference) {
  if (base.authority != null && base.path === '') return '/' + reference
  const cut = base.path.lastIndexOf('/')
  const directory = cut < 0 ? '' : base.path.slice(0, cut + 1)
  return directory + reference
}

/**
 * Resolve `reference` against `base`.
 *
 * @param {string} base an absolute URI
 * @param {string} reference absolute or relative
 * @returns {string} the resolved URI
 */
export function resolve(base, reference) {
  const b = parse(base)
  const r = parse(reference)

  if (r.scheme != null) {
    return recompose({
      scheme: r.scheme,
      authority: r.authority,
      path: removeDotSegments(r.path),
      query: r.query,
      fragment: r.fragment,
    })
  }

  if (r.authority != null) {
    return recompose({
      scheme: b.scheme,
      authority: r.authority,
      path: removeDotSegments(r.path),
      query: r.query,
      fragment: r.fragment,
    })
  }

  if (r.path === '') {
    return recompose({
      scheme: b.scheme,
      authority: b.authority,
      path: b.path,
      query: r.query ?? b.query,
      fragment: r.fragment,
    })
  }

  return recompose({
    scheme: b.scheme,
    authority: b.authority,
    path: removeDotSegments(mergePaths(b, r.path)),
    query: r.query,
    fragment: r.fragment,
  })
}

export { parse, recompose, normalize, removeDotSegments, normalizePercent, normalizeAuthority }
