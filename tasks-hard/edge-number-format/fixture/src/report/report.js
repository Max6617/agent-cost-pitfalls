/**
 * The on-screen metrics report.
 *
 * One line per point: bucket, series and the rendered value. The value column is
 * padded on the left to the width of the widest value in that series, which is
 * what the printed table does — a column of numbers any other way does not line
 * up. A point that is not a finite number is a note, never a printed column.
 */
import { format } from '../format.js'
import { bySeries } from '../data.js'
import { readViewOptions } from './config.js'

/** The widest rendered value in a run of values. */
export function columnWidth(values, options) {
  let width = 0
  for (const value of values) width = Math.max(width, format(value, options).length)
  return width
}

/**
 * Render a capture as a report: `{ title, lines, notes }`.
 */
export function renderReport(points, config = {}) {
  const options = readViewOptions(config)
  const series = [...bySeries(points).entries()]
  const notes = []
  const lines = []

  for (const [name, entries] of series) {
    const finite = entries.filter((e) => typeof e.value === 'number' && Number.isFinite(e.value))
    const width = columnWidth(finite.map((e) => e.value), options)

    for (const entry of entries) {
      if (typeof entry.value !== 'number' || Number.isNaN(entry.value)) {
        notes.push(name + ' ' + entry.bucket + ' is not a number')
        continue
      }
      const rendered = format(entry.value, options) + options.unitSuffix
      lines.push(entry.bucket + '  ' + name.padEnd(10) + '  ' + rendered.padStart(width + options.unitSuffix.length))
    }
  }

  return { title: options.title, lines, notes }
}

/** The widest line in a report, for a caller that wants to draw a rule. */
export function reportWidth(report) {
  return report.lines.reduce((widest, line) => Math.max(widest, line.length), 0)
}
