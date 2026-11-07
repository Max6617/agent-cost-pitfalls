/**
 * Config plumbing.
 *
 * The service reads `config/index.config.json` when it boots. The CLI and the
 * tests hand in overrides, which are merged over the file section by section.
 */
import { readFileSync } from 'node:fs'

const CONFIG_URL = new URL('../config/index.config.json', import.meta.url)

export function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_URL, 'utf8'))
}

/** The settings one index runs on: file values, with the overrides on top. */
export function resolveOptions(overrides = {}) {
  const base = loadConfig()
  return {
    fields: normaliseFields(overrides.fields ?? base.fields),
    scoring: { ...base.scoring, ...(overrides.scoring ?? {}) },
    paging: { ...base.paging, ...(overrides.paging ?? {}) },
    stopwords: overrides.stopwords ?? base.stopwords,
    documents: overrides.documents ?? [],
  }
}

export function normaliseFields(fields) {
  return (fields ?? []).map((field) => ({
    name: String(field.name),
    boost: Number(field.boost ?? 1),
  }))
}

export function boostOf(fields, name) {
  const field = fields.find((candidate) => candidate.name === name)
  return field ? field.boost : 1
}

/** A field value as the index sees it: a string, missing means empty. */
export function readField(document, name) {
  const value = document?.[name]
  return typeof value === 'string' ? value : ''
}
