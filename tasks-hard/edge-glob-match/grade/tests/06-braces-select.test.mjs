// Sub-problem 6: brace alternation and the way a pattern list selects paths.
import test from 'node:test'
import assert from 'node:assert/strict'
import { expandBraces, match, select } from '../src/index.js'

test('braces alternate, and a group without a comma is literal', () => {
  assert.deepEqual(expandBraces('a{b,c}d'), ['abd', 'acd'])
  assert.deepEqual(expandBraces('{a}'), ['{a}'])
  assert.deepEqual(expandBraces('{a,b}'), ['a', 'b'])
  assert.equal(match('{src,test}/index.js', 'src/index.js'), true)
  assert.equal(match('{src,test}/index.js', 'test/index.js'), true)
  assert.equal(match('{src,test}/index.js', 'lib/index.js'), false)
  assert.equal(match('{src,test}/', 'src/'), true)
  assert.equal(match('{src,test}/', 'src'), false)
  assert.equal(match('{src,test}/', 'test/lib/'), false)
  assert.equal(match('data{/raw,}/x', 'data/raw/x'), true)
  assert.equal(match('data{/raw,}/x', 'data/x'), true)
})

test('nested groups and several groups in one pattern', () => {
  assert.deepEqual(expandBraces('{a,{b,c}}'), ['a', 'b', 'c'])
  assert.deepEqual(expandBraces('{a,b}{1,2}'), ['a1', 'a2', 'b1', 'b2'])
  assert.deepEqual(expandBraces('{a,}'), ['a', ''])
  assert.deepEqual(expandBraces('x'), ['x'])
  assert.deepEqual(expandBraces('{a,b'), ['{a,b'])
  assert.equal(match('{a,{b,c}}.js', 'a.js'), true)
  assert.equal(match('{a,{b,c}}.js', 'b.js'), true)
  assert.equal(match('{a,{b,c}}.js', 'c.js'), true)
  assert.equal(match('{a,{b,c}}.js', 'd.js'), false)
})

test('an unclosed or escaped brace is literal', () => {
  assert.deepEqual(expandBraces('{a,b'), ['{a,b'])
  assert.deepEqual(expandBraces('a}b'), ['a}b'])
  assert.deepEqual(expandBraces('\\{a,b\\}'), ['\\{a,b\\}'])
  assert.equal(match('\\{a,b\\}', '{a,b}'), true)
  assert.equal(match('\\{a,b\\}', 'a'), false)
  assert.equal(match('x\\}y', 'x}y'), true)
  assert.equal(match('notes/{a,b', 'notes/{a,b'), true)
})

test('an exclusion applies whatever its position in the list', () => {
  assert.deepEqual(select(['keep.js', 'skip.tmp'], ['**', '!*.tmp']), ['keep.js'])
  assert.deepEqual(select(['keep.js', 'skip.tmp'], ['!*.tmp', '**']), ['keep.js'])
  assert.deepEqual(select(['keep.js', 'skip.tmp'], ['*', '!*.tmp']), ['keep.js'])
  assert.deepEqual(select(['src/a.js', 'src/lib/b.js', 'test/c.js'], ['**/*.js', '!src/**']), ['test/c.js'])
  assert.deepEqual(select(['src/a.js', 'src/lib/b.js'], ['!src/**']), [])
  assert.deepEqual(select(['a.js', 'b.tmp'], ['!*.tmp']), [])
  assert.deepEqual(select(['b.js', 'a.js'], ['*.js']), ['b.js', 'a.js'])
})
