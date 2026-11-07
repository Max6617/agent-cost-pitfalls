import { parseMediaRange, parseAccept, bestMatch, summarise, splitParams, matchScore } from './accept.js'

/**
 * The negotiation the gateway performs for a request.
 *
 * Two headers matter here: `Accept` picks the representation, and
 * `Accept-Language` picks the localisation. Both are weighted lists, but a
 * language tag is not a media range — it has no type and no subtype — so the
 * two are parsed by different code that agree only on the quality rule.
 */

export const REPRESENTATIONS = ['application/json', 'application/xml', 'text/html']
export const LANGUAGES = ['en-GB', 'en', 'de-DE', 'fr']

/** The default representation when the client expresses no preference. */
export const DEFAULT_REPRESENTATION = 'application/json'
export const DEFAULT_LANGUAGE = 'en'

/**
 * Negotiate a representation.
 *
 * @param {string|undefined|null} acceptHeader
 * @returns {{ representation: string, negotiated: boolean }}
 */
export function negotiate(acceptHeader) {
  const chosen = bestMatch(acceptHeader, REPRESENTATIONS)
  if (!chosen) return { representation: DEFAULT_REPRESENTATION, negotiated: false }
  return { representation: chosen.offer, negotiated: true }
}

/**
 * Negotiate a language tag.
 *
 * A language tag is not a media range, so it gets its own split: commas
 * separate tags and a `;q=` parameter carries the weight.
 *
 * @param {string|undefined|null} header
 */
export function negotiateLanguage(header) {
  const entries = []
  const elements = String(header ?? '').split(',')

  elements.forEach((element, order) => {
    const [tag, ...params] = splitParams(element)
    if (!tag) return
    let q = 1
    for (const param of params) {
      const eq = param.indexOf('=')
      if (eq < 0) continue
      if (param.slice(0, eq).trim().toLowerCase() === 'q') {
        const value = Number(param.slice(eq + 1).trim())
        if (Number.isFinite(value) && value >= 0 && value <= 1) q = value
      }
    }
    entries.push({ tag: tag.trim().toLowerCase(), q, order })
  })

  const usable = entries.filter((e) => e.q > 0)
  if (!usable.length) return DEFAULT_LANGUAGE

  usable.sort((a, b) => (b.q !== a.q ? b.q - a.q : a.order - b.order))
  const best = usable[0]
  if (best.tag === '*') return DEFAULT_LANGUAGE

  const exact = LANGUAGES.find((tag) => tag.toLowerCase() === best.tag)
  if (exact) return exact
  return DEFAULT_LANGUAGE
}

/** Should this request be rejected outright? */
export function isUnacceptable(header) {
  const ranges = parseAccept(header)
  return ranges.length > 0 && ranges.every((r) => r.q <= 0)
}

export { parseMediaRange, parseAccept, bestMatch, summarise, splitParams, matchScore }
