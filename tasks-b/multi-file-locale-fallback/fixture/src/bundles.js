/**
 * Bundles are plain data: a flat map from message key to either a string or
 * a plural object ({ zero?, one?, other? }). An effective bundle is the merge
 * of a fallback chain, least specific first - a locale overrides exactly the
 * keys it defines.
 */
export function mergeBundles(list) {
  const merged = {}
  for (const bundle of list) {
    if (!bundle) continue
    for (const [key, value] of Object.entries(bundle)) merged[key] = value
  }
  return merged
}
