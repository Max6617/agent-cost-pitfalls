/**
 * The latency histogram behind the dashboard.
 *
 * `bucketsMs` are the upper bounds, ascending. `observe` is called once per
 * finished request with how long it took.
 */
export class Histogram {
  constructor({ bucketsMs = [100, 1000] } = {}) {
    this.bucketsMs = [...bucketsMs].sort((a, b) => a - b)
    this.count = 0
    this.sumMs = 0
    this.tallies = this.bucketsMs.map(() => 0)
  }

  observe(durationMs) {
    this.count += 1
    this.sumMs += durationMs
    for (let i = 0; i < this.bucketsMs.length; i += 1) {
      if (durationMs <= this.bucketsMs[i]) this.tallies[i] += 1
    }
    return this
  }

  snapshot() {
    return {
      count: this.count,
      sumMs: this.sumMs,
      buckets: this.bucketsMs.map((leMs, i) => ({ leMs, count: this.tallies[i] })),
    }
  }
}
