/**
 * Shipped defaults.
 *
 * These are the values a fresh install runs with. Anything here can be replaced
 * by the config file, the environment or the command line, in that order — the
 * order is the whole point of this module and is written down in README.md.
 */
export const DEFAULTS = Object.freeze({
  // Where the ingest agent listens. 8080 is what the container image exposes.
  port: 8080,

  // Public origin used when building callback URLs. No trailing slash.
  origin: 'http://localhost:8080',

  // Topic the agent publishes to when a batch completes.
  topic: 'ingest.default',

  // Paths the agent will read batches from. Extra paths are additive: a config
  // file that lists one path adds to the defaults rather than replacing them.
  origins: ['file:///var/lib/ingest/drop'],

  // Non-negotiable safety limits. Operators cannot raise them.
  limits: {
    maxBatchBytes: 8 * 1024 * 1024,
    maxInflight: 4,
  },

  // Free-form labels attached to every published record.
  labels: { env: 'local' },

  /// Never logged. Redacted by redact() before anything leaves the process.
  secrets: { apiKey: '', signingSecret: '' },
})
