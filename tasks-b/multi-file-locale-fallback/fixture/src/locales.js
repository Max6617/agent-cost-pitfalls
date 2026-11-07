/**
 * Locale tags ('fr', 'fr-CA', 'zh-Hant-TW') and the fallback chains lookups
 * walk. The rules live in docs/messages-rules.md; this module is the only
 * place tags are parsed.
 */
export function normalizeTag(tag) {
  if (typeof tag !== 'string' || !tag.trim()) {
    throw new TypeError('a locale tag must be a non-empty string')
  }
  const parts = tag.trim().split('-').filter(Boolean)
  return parts
    .map((part, i) => {
      if (i === 0) return part.toLowerCase()
      if (part.length === 4) return part[0].toUpperCase() + part.slice(1).toLowerCase()
      return part.toUpperCase()
    })
    .join('-')
}

export function languageOf(tag) {
  return normalizeTag(tag).split('-')[0]
}

export function fallbackChain(tag, defaultLocale = 'en') {
  const normalized = normalizeTag(tag)
  const fallback = normalizeTag(defaultLocale)
  const chain = [normalized]
  // every lookup ends at the default locale
  if (normalized !== fallback) chain.push(fallback)
  return chain
}
