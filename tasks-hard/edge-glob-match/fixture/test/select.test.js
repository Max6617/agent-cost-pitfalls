import test from 'node:test'
import assert from 'node:assert/strict'
import { select } from '../src/index.js'

test('a list includes and then excludes', () => {
  assert.deepEqual(select(['app.js', 'app.tmp'], ['*', '!*.tmp']), ['app.js'])
  assert.deepEqual(select(['src/a.js', 'test/b.js'], ['src/*']), ['src/a.js'])
})
