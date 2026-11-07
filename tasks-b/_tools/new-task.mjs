#!/usr/bin/env node
/**
 * new-task — scaffold a tasks-b task with the grader path already correct.
 *
 *   node tasks-b/_tools/new-task.mjs lh-my-task
 *
 * Creates the four directories a finished task needs (fixture/, grade/tests/,
 * reference/) and a task.json whose "test" points at the shared hidden grader.
 * It deliberately writes no fixture code: copy the shape of an existing task
 * instead, then run _tools/verify-task.mjs until it is green.
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const batchRoot = resolve(here, '..')
const grader = join(batchRoot, '_grade', 'run.mjs').split('\\').join('/')

const id = process.argv[2]
if (!id) { console.error('usage: node tasks-b/_tools/new-task.mjs <id>'); process.exit(2) }
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error('id must be [a-z0-9][a-z0-9-]*'); process.exit(2) }
const dir = join(batchRoot, id)
if (existsSync(dir)) { console.error('tasks-b/' + id + ' already exists'); process.exit(1) }

for (const d of ['fixture/src', 'fixture/test', 'grade/tests', 'reference']) mkdirSync(join(dir, d), { recursive: true })
writeFileSync(join(dir, 'task.json'), JSON.stringify({
  prompt: 'TODO: the symptom, in the voice of a colleague. No file names, no fix.',
  repo: './fixture',
  test: 'node ' + grader + ' ' + id,
  setup: '',
}, null, 2) + '\n')
writeFileSync(join(dir, 'fixture', 'package.json'), JSON.stringify({ name: id, version: '1.0.0', type: 'module', private: true, scripts: { test: 'node --test' } }, null, 2) + '\n')
writeFileSync(join(dir, 'NOTES.md'), '# ' + id + '\n\nstratum: \n\n## sub-problems\n\n1. \n\n## measured\n\n- untouched fixture: / hidden cases\n- reference: / hidden cases\n- visible suite: fails before, passes after\n')

console.log('created tasks-b/' + id + '/')
console.log('grader: ' + grader)
console.log('tasks in batch: ' + readdirSync(batchRoot).filter((d) => existsSync(join(batchRoot, d, 'task.json'))).length)
