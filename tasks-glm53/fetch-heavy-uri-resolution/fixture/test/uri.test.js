import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, recompose, normalize, removeDotSegments, normalizePercent, normalizeAuthority } from '../src/uri.js'
import { resolve, mergePaths } from '../src/resolve.js'

test('a URI splits into its components', () => {
  const parts = parse('https://user@example.com:8443/a/b?x=1#frag')
  assert.equal(parts.scheme, 'https')
  assert.equal(parts.authority, 'user@example.com:8443')
  assert.equal(parts.path, '/a/b')
  assert.equal(parts.rooted, true)
  assert.equal(parts.query, 'x=1')
  assert.equal(parts.fragment, 'frag')
})

test('a relative reference has no scheme, no authority and is not rooted', () => {
  const parts = parse('a/b?x')
  assert.equal(parts.scheme, null)
  assert.equal(parts.authority, null)
  assert.equal(parts.path, 'a/b')
  assert.equal(parts.rooted, false)
  assert.equal(parts.query, 'x')
})

test('an empty query and an absent query are different', () => {
  assert.equal(parse('a?').query, '')
  assert.equal(parse('a').query, null)
})

test('components round-trip', () => {
  for (const uri of ['http://a/b/c', 'mailto:a@b.c', 'http://a', 'a/b', '//a/b', 'http://a/b?q#f']) {
    assert.equal(recompose(parse(uri)), uri, uri)
  }
})

test('a scheme-only URI does not gain a separator', () => {
  assert.equal(recompose({ scheme: 'mailto', authority: null, path: 'a@b.c', query: null, fragment: null }), 'mailto:a@b.c')
})

test('an octet spelling an unreserved character is decoded', () => {
  assert.equal(normalizePercent('%7Euser'), '~user')
  assert.equal(normalizePercent('%2D%2E%5F'), '-._')
  assert.equal(normalizePercent('%41'), 'A')
})

test('an octet spelling a reserved character is kept, uppercased', () => {
  assert.equal(normalizePercent('%2f'), '%2F')
  assert.equal(normalizePercent('%3a'), '%3A')
  assert.equal(normalizePercent('a%20b'), 'a%20b')
})

test('the scheme and host are lowercased but the path is not', () => {
  assert.equal(normalize('HTTP://Example.COM/Path'), 'http://example.com/Path')
})

test('a default port is dropped', () => {
  assert.equal(normalize('http://example.com:80/a'), 'http://example.com/a')
  assert.equal(normalize('https://example.com:443/a'), 'https://example.com/a')
  assert.equal(normalize('http://example.com:8080/a'), 'http://example.com:8080/a')
})

test('userinfo survives authority normalisation', () => {
  assert.equal(normalize('http://User@Example.com:80/p'), 'http://User@example.com/p')
})

test('dot segments are removed from a path', () => {
  assert.equal(removeDotSegments('a/b/../c'), 'a/c')
  assert.equal(removeDotSegments('a/./b'), 'a/b')
  assert.equal(removeDotSegments('../a'), 'a')
  assert.equal(removeDotSegments('a/b/..'), 'a/')
})

test('a dot inside a segment is not a dot segment', () => {
  assert.equal(removeDotSegments('a..b/c'), 'a..b/c')
  assert.equal(removeDotSegments('.../a'), '.../a')
})

const BASE = 'http://a/b/c/d;p?q'

test('an absolute reference replaces the base entirely', () => {
  assert.equal(resolve(BASE, 'http://x/y'), 'http://x/y')
  assert.equal(resolve(BASE, 'https://x/y'), 'https://x/y')
})

test('a network-path reference keeps the scheme and swaps the authority', () => {
  assert.equal(resolve(BASE, '//g'), 'http://g')
  assert.equal(resolve(BASE, '//g/h'), 'http://g/h')
})

test('an absolute path reference replaces the path', () => {
  assert.equal(resolve(BASE, '/g'), 'http://a/g')
  assert.equal(resolve(BASE, '/g/h'), 'http://a/g/h')
})

test('a relative path reference merges against the base directory', () => {
  assert.equal(resolve(BASE, 'g'), 'http://a/b/c/g')
  assert.equal(resolve(BASE, './g'), 'http://a/b/c/g')
  assert.equal(resolve(BASE, 'g/'), 'http://a/b/c/g/')
  assert.equal(resolve(BASE, '../g'), 'http://a/b/g')
  assert.equal(resolve(BASE, '../../g'), 'http://a/g')
  assert.equal(resolve(BASE, '../../../g'), 'http://a/g')
})

test('a reference with only a query keeps the base path', () => {
  assert.equal(resolve(BASE, '?y'), 'http://a/b/c/d;p?y')
})

test('a reference with only a fragment keeps the base path and query', () => {
  assert.equal(resolve(BASE, '#s'), 'http://a/b/c/d;p?q#s')
})

test('an empty reference drops the base fragment but keeps everything else', () => {
  assert.equal(resolve('http://a/b/c/d;p?q#f', ''), 'http://a/b/c/d;p?q')
})

test('a reference with a path and a query replaces both', () => {
  assert.equal(resolve(BASE, 'g?y'), 'http://a/b/c/g?y')
  assert.equal(resolve(BASE, 'g#s'), 'http://a/b/c/g#s')
  assert.equal(resolve(BASE, 'g?y#s'), 'http://a/b/c/g?y#s')
})

test('a base with an empty path resolves a relative reference from the root', () => {
  assert.equal(resolve('http://a', 'g'), 'http://a/g')
  assert.equal(resolve('http://a/', 'g'), 'http://a/g')
})

test('a semicolon segment is an ordinary path segment', () => {
  assert.equal(resolve(BASE, ';x'), 'http://a/b/c/;x')
})

test('mergePaths drops the last base segment', () => {
  assert.equal(mergePaths({ authority: 'a', path: '/b/c/d' }, 'g'), '/b/c/g')
  assert.equal(mergePaths({ authority: null, path: 'd' }, 'g'), 'g')
  assert.equal(mergePaths({ authority: null, path: '' }, 'g'), 'g')
  assert.equal(mergePaths({ authority: 'a', path: '' }, 'g'), '/g')
})

test('a relative reference that climbs out of the base directory stays relative', () => {
  assert.equal(resolve('HTTP://A/b/c', '../g'), 'HTTP://A/g')
  assert.equal(resolve('HTTP://A/b/c', 'd/../g'), 'HTTP://A/b/g')
})

test('a resolved URI can be normalised afterwards', () => {
  assert.equal(normalize(resolve('HTTP://A/b/c', '../g')), 'http://a/g')
  assert.equal(normalize('http://a/b/%7Eg'), 'http://a/b/~g')
  assert.equal(normalize('http://a/b/%2Fg'), 'http://a/b/%2Fg')
  assert.equal(normalize('http://a/./b/../c'), 'http://a/c')
})

test('every component round-trips, empty query included', () => {
  for (const uri of ['http://a/b?', 'http://a/b#', 'a?', 'a#', '//a', '//a?q']) {
    assert.equal(recompose(parse(uri)), uri, uri)
  }
})
