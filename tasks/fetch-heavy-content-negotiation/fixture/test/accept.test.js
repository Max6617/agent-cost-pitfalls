import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMediaRange, parseAccept, bestMatch, summarise, splitParams, matchScore } from '../src/accept.js'
import { negotiate, negotiateLanguage, isUnacceptable, REPRESENTATIONS, DEFAULT_REPRESENTATION } from '../src/negotiate.js'

test('a media range parses into type, subtype and quality', () => {
  const range = parseMediaRange('text/html;q=0.8')
  assert.equal(range.type, 'text')
  assert.equal(range.subtype, 'html')
  assert.equal(range.q, 0.8)
  assert.deepEqual(range.params, {})
})

test('the quality defaults to one', () => {
  assert.equal(parseMediaRange('text/html').q, 1)
})

test('parameters other than q are kept', () => {
  const range = parseMediaRange('text/html;level=2;q=0.5')
  assert.equal(range.q, 0.5)
  assert.deepEqual(range.params, { level: '2' })
})

test('a quoted parameter value is unquoted', () => {
  const range = parseMediaRange('application/json;profile="a;b"')
  assert.equal(range.params.profile, 'a;b')
})

test('a quoted separator does not split the element', () => {
  assert.deepEqual(splitParams('application/json;profile="a;b";q=0.5'), ['application/json', 'profile="a;b"', 'q=0.5'])
})

test('a quality outside zero to one is not a media range', () => {
  assert.equal(parseMediaRange('text/html;q=1.5'), null)
  assert.equal(parseMediaRange('text/html;q=-0.1'), null)
  assert.equal(parseMediaRange('text/html;q=abc'), null)
})

test('an element without a slash is not a media range', () => {
  assert.equal(parseMediaRange('text'), null)
  assert.equal(parseMediaRange(''), null)
})

test('a header parses into an ordered list and keeps the client order', () => {
  const ranges = parseAccept('text/html, application/json;q=0.9, */*;q=0.1')
  assert.equal(ranges.length, 3)
  assert.deepEqual(ranges.map((r) => r.order), [0, 1, 2])
  assert.equal(ranges[0].q, 1)
  assert.equal(ranges[2].type, '*')
})

test('an absent header is an empty list, not an error', () => {
  assert.deepEqual(parseAccept(undefined), [])
  assert.deepEqual(parseAccept(''), [])
})

test('an unparsable element is dropped and the rest survive', () => {
  const ranges = parseAccept('text/html, ;q=, application/json;q=0.5')
  assert.equal(ranges.length, 2)
  assert.equal(ranges[1].type, 'application')
})

test('specificity ranks a concrete type above a wildcard', () => {
  const exact = parseMediaRange('text/html')
  const subtypeWild = parseMediaRange('text/*')
  const fullWild = parseMediaRange('*/*')
  assert.ok(matchScore(exact, 'text/html') > matchScore(subtypeWild, 'text/html'))
  assert.ok(matchScore(subtypeWild, 'text/html') > matchScore(fullWild, 'text/html'))
})

test('a mismatched range scores zero', () => {
  assert.equal(matchScore(parseMediaRange('text/html'), 'application/json'), 0)
  assert.equal(matchScore(parseMediaRange('text/*'), 'application/json'), 0)
})

test('the highest quality wins', () => {
  const chosen = bestMatch('application/json;q=0.5, text/html', REPRESENTATIONS)
  assert.equal(chosen.offer, 'text/html')
  assert.equal(chosen.q, 1)
})

test('quality is compared before specificity', () => {
  const chosen = bestMatch('application/*;q=0.9, text/html;q=0.2', REPRESENTATIONS)
  assert.equal(chosen.offer, 'application/json')
})

test('specificity breaks a tie on quality', () => {
  const chosen = bestMatch('*/*, text/html', REPRESENTATIONS)
  assert.equal(chosen.offer, 'text/html')
})

test('client order breaks a tie on quality and specificity', () => {
  const chosen = bestMatch('application/xml, text/html', ['text/html', 'application/xml'])
  assert.equal(chosen.offer, 'application/xml')
})

test('q=0 means not acceptable and is never chosen', () => {
  assert.equal(bestMatch('text/html;q=0', ['text/html']), null)
  assert.equal(bestMatch('text/html;q=0, application/json;q=0.1', ['text/html', 'application/json']).offer, 'application/json')
})

test('a wildcard with q=0 rules out everything it covers', () => {
  assert.equal(bestMatch('*/*;q=0', REPRESENTATIONS), null)
})

test('no header means the default representation, unnegotiated', () => {
  const result = negotiate(undefined)
  assert.equal(result.representation, DEFAULT_REPRESENTATION)
  assert.equal(result.negotiated, false)
})

test('a header with no usable entry also falls back', () => {
  assert.equal(negotiate('').negotiated, false)
  assert.equal(negotiate('*/*;q=0').negotiated, false)
})

test('a usable header is negotiated', () => {
  const result = negotiate('application/xml')
  assert.equal(result.representation, 'application/xml')
  assert.equal(result.negotiated, true)
})

test('the debug summary renders the parsed list', () => {
  assert.deepEqual(summarise('text/html;q=0.5, */*'), ['text/html;q=0.5', '*/*;q=1'])
})

test('a request that accepts nothing is unacceptable', () => {
  assert.equal(isUnacceptable('text/html;q=0'), true)
  assert.equal(isUnacceptable('*/*;q=0'), true)
  assert.equal(isUnacceptable('text/html'), false)
  assert.equal(isUnacceptable(undefined), false)
})

test('a language tag matches exactly when it is supported', () => {
  assert.equal(negotiateLanguage('de-DE'), 'de-DE')
  assert.equal(negotiateLanguage('en-GB'), 'en-GB')
})

test('a language tag falls back to its primary subtag', () => {
  assert.equal(negotiateLanguage('de-AT'), 'de-DE')
  assert.equal(negotiateLanguage('en-US'), 'en-GB')
})

test('an unsupported language falls back to the default', () => {
  assert.equal(negotiateLanguage('zz'), 'en')
  assert.equal(negotiateLanguage('*'), 'en')
  assert.equal(negotiateLanguage(undefined), 'en')
})

test('the language header is weighted too', () => {
  assert.equal(negotiateLanguage('de-DE;q=0.1, fr;q=0.9'), 'fr')
  assert.equal(negotiateLanguage('de-DE;q=0, fr;q=0.5'), 'fr')
})
