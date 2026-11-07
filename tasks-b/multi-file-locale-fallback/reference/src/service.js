/**
 * The message service: key lookup with fallback, plural selection and
 * interpolation under one mode ('strict' or 'lenient'). The policies are
 * pinned in docs/messages-rules.md.
 */
import { fallbackChain } from './locales.js'
import { selectPluralText } from './plurals.js'
import { interpolate } from './interpolate.js'
import { mergeBundles } from './bundles.js'
import { MissingKeyError } from './errors.js'

export class MessageService {
  constructor({ bundles = {}, defaultLocale = 'en', mode = 'lenient' } = {}) {
    if (mode !== 'strict' && mode !== 'lenient') {
      throw new TypeError(`unknown mode "${mode}"`)
    }
    this.bundles = bundles
    this.defaultLocale = defaultLocale
    this.mode = mode
  }

  resolve(key, locale) {
    for (const link of fallbackChain(locale, this.defaultLocale)) {
      const bundle = this.bundles[link]
      if (bundle && bundle[key] !== undefined) return bundle[key]
    }
    return undefined
  }

  effectiveBundle(locale) {
    const chain = fallbackChain(locale, this.defaultLocale)
    // least specific first, so the requested locale overrides its parents
    return mergeBundles(chain.map((link) => this.bundles[link]).reverse())
  }

  t(key, { locale, n, values } = {}) {
    const requested = locale ?? this.defaultLocale
    const message = this.resolve(key, requested)
    if (message === undefined) return this.#missing(key, requested)
    const text = this.#text(message, n, requested)
    if (text === undefined) return this.#missing(key, requested)
    const count = n === undefined ? values : { ...values, n }
    return interpolate(text, count, { mode: this.mode, key })
  }

  #text(message, n, locale) {
    if (typeof message === 'string') return message
    if (n === undefined) return message.other
    return selectPluralText(message, n, locale)
  }

  #missing(key, locale) {
    if (this.mode === 'strict') throw new MissingKeyError(key, locale)
    // a missing key still renders: the key itself is the last-resort text
    return key
  }
}

export function createMessageService(options) {
  return new MessageService(options)
}
