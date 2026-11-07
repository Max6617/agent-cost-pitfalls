/**
 * The frozen capture the demo CLI and the report tests read.
 *
 * It is a checked-in file rather than a live query so that a rendered report is
 * reproducible: the reporting container has no network and the numbers a
 * customer sees should not change between two runs of the same command.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SAMPLES = fileURLToPath(new URL('../data/samples.json', import.meta.url))

export function loadSamples() {
  return JSON.parse(readFileSync(SAMPLES, 'utf8'))
}

/** Group the capture by series, keeping the order the file lists them in. */
export function bySeries(points) {
  const series = new Map()
  for (const point of points) {
    if (!series.has(point.series)) series.set(point.series, [])
    series.get(point.series).push(point)
  }
  return series
}
