/**
 * Plural category selection. The category table is pinned in
 * docs/messages-rules.md; the rule is chosen by the language subtag, so a
 * region never changes it.
 */
import { languageOf } from './locales.js'

const RULES = {
  en: (n) => (n === 1 ? 'one' : 'other'),
  fr: (n) => (n === 1 ? 'one' : 'other'),
  de: (n) => (n === 1 ? 'one' : 'other'),
}

const DEFAULT_RULE = RULES.en

export function pluralCategory(locale, n) {
  const rule = RULES[languageOf(locale)] ?? DEFAULT_RULE
  return rule(n)
}

export function selectPluralText(message, n, locale) {
  if (n === 0 && message.zero !== undefined) return message.zero
  const category = pluralCategory(locale, n)
  return message[category] ?? message.other
}
