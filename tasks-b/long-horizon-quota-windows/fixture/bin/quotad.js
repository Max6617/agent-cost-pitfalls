#!/usr/bin/env node
/**
 * quotad — replay a capture of request events through the quota service.
 *
 *   node bin/quotad.js capture.jsonl
 *
 * One JSON event per line: {"id":"r-1","key":"acme","at":1700000000,"cost":1}
 * Prints the section 7 usage report for every key in the capture, in the
 * order the keys first appear.
 */
import { readFileSync } from 'node:fs'
import { createQuotaService } from '../src/index.js'

const file = process.argv[2]
if (!file) {
  console.error('usage: node bin/quotad.js <events.jsonl>')
  process.exit(2)
}

const lines = readFileSync(file, 'utf8').split('\n').filter((line) => line.trim().length > 0)
const service = createQuotaService()
const keys = []
for (const line of lines) {
  const event = JSON.parse(line)
  if (!keys.includes(event.key)) keys.push(event.key)
  service.admit(event)
}
for (const key of keys) {
  console.log(key, JSON.stringify(service.usage(key)))
}
