import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVersion, compareVersions, sortVersions } from '../src/version.js'
import { satisfies, parseComparatorSet } from '../src/range.js'
import { maxSatisfying, resolveOne, resolveAll } from '../src/resolve.js'

const parsed = (text) => {
  const v = parseVersion(text)
  assert.ok(v, 'expected ' + text + ' to parse')
  return v
}

test('parses a plain version', () => {
  const v = parsed('1.2.3')
  assert.equal(v.major, 1)
  assert.equal(v.minor, 2)
  assert.equal(v.patch, 3)
  assert.deepEqual(v.prerelease, [])
})

test('parses a prerelease and build metadata', () => {
  const v = parsed('1.2.3-beta.2+build.9')
  assert.deepEqual(v.prerelease, ['beta', 2])
  assert.deepEqual(v.build, ['build', '9'])
})

test('a leading v is tolerated but not part of the version', () => {
  assert.equal(parsed('v1.2.3').raw, '1.2.3')
})

test('rejects a version with leading zeros in a numeric field', () => {
  assert.equal(parseVersion('1.02.3'), null)
  assert.equal(parseVersion('01.2.3'), null)
})

test('rejects anything that is not three numeric fields', () => {
  assert.equal(parseVersion('1.2'), null)
  assert.equal(parseVersion('1.2.3.4'), null)
  assert.equal(parseVersion('one.two.three'), null)
})

test('orders by major, then minor, then patch', () => {
  assert.ok(compareVersions(parsed('1.0.0'), parsed('2.0.0')) < 0)
  assert.ok(compareVersions(parsed('2.1.0'), parsed('2.0.9')) > 0)
  assert.ok(compareVersions(parsed('1.2.3'), parsed('1.2.3')) === 0)
})

test('a prerelease sorts below its release', () => {
  assert.ok(compareVersions(parsed('1.0.0-alpha'), parsed('1.0.0')) < 0)
  assert.ok(compareVersions(parsed('1.0.0-alpha.1'), parsed('1.0.0-alpha.beta')) < 0)
  assert.ok(compareVersions(parsed('1.0.0-alpha.beta'), parsed('1.0.0-beta')) < 0)
  assert.ok(compareVersions(parsed('1.0.0-beta.2'), parsed('1.0.0-beta.11')) < 0)
  assert.ok(compareVersions(parsed('1.0.0-rc.1'), parsed('1.0.0')) < 0)
})

test('build metadata never affects precedence', () => {
  assert.equal(compareVersions(parsed('1.0.0+a'), parsed('1.0.0+b')), 0)
  assert.equal(compareVersions(parsed('1.0.0+a'), parsed('1.0.0')), 0)
})

test('sorts a version list', () => {
  assert.deepEqual(sortVersions(['1.0.0', '0.9.9', '1.0.0-beta', '1.0.1']), [
    '0.9.9',
    '1.0.0-beta',
    '1.0.0',
    '1.0.1',
  ])
})

test('an exact range matches only that version', () => {
  assert.equal(satisfies('1.2.3', '1.2.3'), true)
  assert.equal(satisfies('1.2.4', '1.2.3'), false)
  assert.equal(satisfies('1.2.3', '=1.2.3'), true)
})

test('a partial version in a range is a floor and a ceiling', () => {
  assert.equal(satisfies('1.2.3', '1.2'), true)
  assert.equal(satisfies('1.3.0', '1.2'), false)
  assert.equal(satisfies('1.9.9', '1'), true)
  assert.equal(satisfies('2.0.0', '1'), false)
})

test('the comparison operators mean what they say', () => {
  assert.equal(satisfies('1.2.4', '>1.2.3'), true)
  assert.equal(satisfies('1.2.3', '>1.2.3'), false)
  assert.equal(satisfies('1.2.3', '>=1.2.3'), true)
  assert.equal(satisfies('1.2.2', '<1.2.3'), true)
  assert.equal(satisfies('1.2.3', '<1.2.3'), false)
  assert.equal(satisfies('1.2.3', '<=1.2.3'), true)
})

test('caret allows changes that do not touch the leftmost non-zero field', () => {
  assert.equal(satisfies('1.2.4', '^1.2.3'), true)
  assert.equal(satisfies('1.9.0', '^1.2.3'), true)
  assert.equal(satisfies('2.0.0', '^1.2.3'), false)
  assert.equal(satisfies('1.2.2', '^1.2.3'), false)
})

test('caret below one pins the minor and the patch', () => {
  assert.equal(satisfies('0.2.4', '^0.2.3'), true)
  assert.equal(satisfies('0.3.0', '^0.2.3'), false)
  assert.equal(satisfies('0.0.3', '^0.0.3'), true)
  assert.equal(satisfies('0.0.4', '^0.0.3'), false)
})

test('caret on a partial version expands the way the spec says', () => {
  assert.equal(satisfies('1.5.0', '^1.2'), true)
  assert.equal(satisfies('2.0.0', '^1.2'), false)
  assert.equal(satisfies('1.9.9', '^1'), true)
  assert.equal(satisfies('2.0.0', '^1'), false)
  assert.equal(satisfies('0.2.9', '^0.2'), true)
  assert.equal(satisfies('0.3.0', '^0.2'), false)
})

test('tilde allows patch-level changes only', () => {
  assert.equal(satisfies('1.2.9', '~1.2.3'), true)
  assert.equal(satisfies('1.3.0', '~1.2.3'), false)
  assert.equal(satisfies('1.2.0', '~1.2.3'), false)
})

test('tilde on a partial version allows the whole minor', () => {
  assert.equal(satisfies('1.2.9', '~1.2'), true)
  assert.equal(satisfies('1.3.0', '~1.2'), false)
})

test('a hyphen range includes both ends', () => {
  assert.equal(satisfies('1.2.3', '1.2.3 - 2.3.4'), true)
  assert.equal(satisfies('2.3.4', '1.2.3 - 2.3.4'), true)
  assert.equal(satisfies('2.3.5', '1.2.3 - 2.3.4'), false)
  assert.equal(satisfies('1.2.2', '1.2.3 - 2.3.4'), false)
})

test('a union matches when any comparator set matches', () => {
  assert.equal(satisfies('1.2.3', '1.2.3 || 3.0.0'), true)
  assert.equal(satisfies('3.0.0', '1.2.3 || 3.0.0'), true)
  assert.equal(satisfies('2.0.0', '1.2.3 || 3.0.0'), false)
})

test('a space inside a comparator set means both must hold', () => {
  assert.equal(satisfies('1.5.0', '>=1.2.3 <2.0.0'), true)
  assert.equal(satisfies('2.0.0', '>=1.2.3 <2.0.0'), false)
})

test('a comparator set parses into its individual comparators', () => {
  const set = parseComparatorSet(['>=1.2.3', '<2.0.0'])
  assert.equal(set.length, 2)
  assert.equal(set[0].op, '>=')
  assert.equal(set[1].op, '<')
})

test('a prerelease only matches a range that names a prerelease of the same tuple', () => {
  assert.equal(satisfies('1.2.3-beta.1', '>=1.0.0'), false)
  assert.equal(satisfies('1.2.3-beta.1', '^1.2.3'), false)
  assert.equal(satisfies('1.2.3-beta.1', '>=1.2.3-alpha'), true)
  assert.equal(satisfies('1.2.4-beta.1', '>=1.2.3-alpha'), false)
  assert.equal(satisfies('2.0.0-rc.1', '2.0.0-rc.1'), true)
  assert.equal(satisfies('2.0.0-rc.2', '2.0.0-rc.1'), false)
})

test('maxSatisfying picks the highest allowed version', () => {
  const versions = ['1.0.0', '1.2.0', '1.2.3', '1.3.0', '2.0.0-rc.1']
  assert.equal(maxSatisfying(versions, '^1.2.0'), '1.3.0')
  assert.equal(maxSatisfying(versions, '~1.2.0'), '1.2.3')
  assert.equal(maxSatisfying(versions, '2.0.0-rc.1'), '2.0.0-rc.1')
  assert.equal(maxSatisfying(versions, '^3.0.0'), null)
})

test('the resolver reports a dependency it cannot satisfy', () => {
  const result = resolveOne({ name: 'left-pad', versions: ['1.0.0'], range: '^2.0.0' })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'no-matching-version')
})

test('the resolver reports which dependencies changed', () => {
  const { resolved, failed } = resolveAll([
    { name: 'a', versions: ['1.0.0', '1.4.0'], range: '^1.0.0', existing: '1.0.0' },
    { name: 'b', versions: ['2.0.0'], range: '^3.0.0' },
  ])
  assert.deepEqual(resolved, [{ name: 'a', ok: true, version: '1.4.0', changed: true }])
  assert.equal(failed.length, 1)
  assert.equal(failed[0].name, 'b')
  assert.equal(failed[0].reason, 'no-matching-version')
})
