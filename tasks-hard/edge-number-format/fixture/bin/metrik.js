#!/usr/bin/env node
/**
 * metrik — print the frozen capture as a report, the config view and an export.
 *
 *   node bin/metrik.js report
 *   node bin/metrik.js config
 *   node bin/metrik.js csv
 *   node bin/metrik.js number 1,234.5
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderReport, reportWidth, readNumber, csv, loadSamples, parseNumber } from '../src/index.js'

const CONFIG = fileURLToPath(new URL('../config/report.config.json', import.meta.url))

const command = process.argv[2] ?? 'report'
const config = JSON.parse(readFileSync(CONFIG, 'utf8'))
const samples = loadSamples()

if (command === 'report') {
  const report = renderReport(samples.points, config)
  console.log(report.title)
  for (const line of report.lines) console.log(line)
  for (const note of report.notes) console.log('note: ' + note)
  console.log('-'.repeat(reportWidth(report)))
} else if (command === 'config') {
  console.log('digits      ' + readNumber(config, 'digits', 2))
  console.log('significant ' + (config.significant ?? 'default'))
  console.log('grouping    ' + config.grouping)
} else if (command === 'csv') {
  console.log(csv(samples.points, { delimiter: config.csvDelimiter }))
} else if (command === 'number') {
  console.log(parseNumber(process.argv.slice(3).join(' ')))
} else {
  console.error('usage: metrik [report|config|csv|number <text>]')
  process.exit(2)
}
