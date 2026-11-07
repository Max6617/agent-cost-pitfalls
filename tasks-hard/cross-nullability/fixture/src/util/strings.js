/** Left-over helpers from the address work. Small, dependency-free, still used. */
import { isPlainObject } from '../core.js'

const POSTCODE_PATTERNS = {
  DE: /^\d{5}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/,
  US: /^\d{5}(-\d{4})?$/,
}

export function normalizeCountry(code) {
  if (typeof code !== 'string') return ''
  return code.trim().toUpperCase()
}

export function postcodeValid(code, country) {
  const pattern = POSTCODE_PATTERNS[normalizeCountry(country)]
  if (!pattern) return true
  if (typeof code !== 'string') return false
  return pattern.test(code.trim())
}

export function formatLines(lines) {
  if (!Array.isArray(lines)) return ''
  return lines
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line) => line !== '')
    .join(', ')
}

export function chunk(list, size) {
  const out = []
  if (!Array.isArray(list) || size < 1) return out
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export function uniqueBy(list, key) {
  const seen = new Set()
  const out = []
  for (const item of list ?? []) {
    const value = isPlainObject(item) ? item[key] : item
    if (seen.has(value)) continue
    seen.add(value)
    out.push(item)
  }
  return out
}

/** Round-robin over a list, used by the importer's retry shuffling. */
export function rotate(list, offset) {
  if (!Array.isArray(list) || list.length === 0) return []
  const n = ((offset % list.length) + list.length) % list.length
  return list.slice(n).concat(list.slice(0, n))
}

export function toTitleCase(text) {
  if (typeof text !== 'string') return ''
  return text
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
