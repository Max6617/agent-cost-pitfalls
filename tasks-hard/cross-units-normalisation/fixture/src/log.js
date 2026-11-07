import { MS_PER_SECOND } from './units.js'
import { redact } from './util/redact.js'

/**
 * The structured log writer.
 *
 * `write` is handed the record and how long the request took, and returns the
 * line that would be published plus what the pipeline needs to know about it.
 */
export class LogWriter {
  constructor({ slowMs = 1000, maxRecordBytes = 8192 } = {}) {
    this.slowMs = slowMs
    this.maxRecordBytes = maxRecordBytes
    this.written = 0
    this.slowCount = 0
  }

  write(record, durationMs) {
    const line = JSON.stringify(redact(record))
    const bytes = line.length
    const slow = durationMs >= this.slowMs / MS_PER_SECOND
    const tooLarge = bytes > this.maxRecordBytes
    this.written += 1
    if (slow) this.slowCount += 1
    return { line, bytes, slow, tooLarge, durationMs }
  }

  stats() {
    return {
      written: this.written,
      slow: this.slowCount,
      slowMs: this.slowMs,
      slowSeconds: Math.round(this.slowMs / MS_PER_SECOND),
    }
  }
}
