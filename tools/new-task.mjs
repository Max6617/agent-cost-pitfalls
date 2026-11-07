#!/usr/bin/env node
/**
 * new-task — scaffold a task directory so writing one is editing, not guessing.
 *
 *   node tools/new-task.mjs multi-file-refactor
 *
 * Creates tasks/<id>/{task.json, fixture/} with a working example, then prints the
 * rules. It does NOT create a passing test by accident: the scaffold's test is
 * written to fail until you implement the task, because a task whose test already
 * passes measures nothing.
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const id = process.argv[2]
if (!id) { console.error('usage: node tools/new-task.mjs <id>'); process.exit(2) }
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error('id must be [a-z0-9][a-z0-9-]* (it becomes a directory name)'); process.exit(2) }

const dir = resolve('tasks', id)
if (existsSync(dir)) { console.error('tasks/' + id + ' already exists'); process.exit(1) }
mkdirSync(join(dir, 'fixture', 'src'), { recursive: true })
mkdirSync(join(dir, 'fixture', 'test'), { recursive: true })

writeFileSync(join(dir, 'task.json'), JSON.stringify({
  prompt: 'TODO: state the task in one or two sentences, the way a colleague would. Name the symptom, not the fix.',
  repo: './fixture',
  test: 'node --test',
  setup: '',
}, null, 2) + '\n')

writeFileSync(join(dir, 'fixture', 'package.json'), JSON.stringify({ name: id, type: 'module', version: '1.0.0', scripts: { test: 'node --test' } }, null, 2) + '\n')
writeFileSync(join(dir, 'fixture', 'src', 'index.js'), [
  '// TODO: implement the BROKEN behaviour here. The test must fail against this.',
  'export function parse(input) {',
  '  return String(input).split(",")',
  '}',
  '',
].join('\n'))
writeFileSync(join(dir, 'fixture', 'test', 'index.test.js'), [
  "import test from 'node:test'",
  "import assert from 'node:assert/strict'",
  "import { parse } from '../src/index.js'",
  '',
  "// TODO: write a suite that FAILS against the current src and passes on a correct",
  "// implementation. Several assertions across several behaviours, not one.",
  "test('parses a simple list', () => assert.deepEqual(parse('a,b'), ['a', 'b']))",
  "test('trims whitespace', () => assert.deepEqual(parse('a , b'), ['a', 'b']))",
  "test('drops empty entries', () => assert.deepEqual(parse('a,,b'), ['a', 'b']))",
  '',
].join('\n'))

const existing = readdirSync(resolve('tasks'), { withFileTypes: true }).filter((d) => d.isDirectory()).length
console.log('created tasks/' + id + '/')
console.log('')
console.log('Now:')
console.log('  1. make src/ genuinely broken, so the tests FAIL')
console.log('  2. write task.json prompt in the user\'s voice - symptom, not solution')
console.log('  3. add more assertions: one assertion rarely separates solutions')
console.log('  4. node tools/validate-tasks.mjs --dir tasks')
console.log('')
console.log('Rules that matter: harness-agnostic (shell + editor + search only), objectively')
console.log('gradable by a hidden suite, never graded by an LLM, stratified by multi-stepness,')
console.log('and NOT used to design any preset.')
console.log('')
console.log('Tasks so far: ' + existing + '  (the design targets 20-40)')
