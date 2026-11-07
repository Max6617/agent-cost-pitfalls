/**
 * The document model: the global block, the ordered list of sections, and
 * the case-insensitive name index used while building.
 */

export class DocBuilder {
  constructor() {
    this.doc = { globals: {}, sections: [] }
    this.byName = new Map()
  }

  section(name) {
    const folded = name.toLowerCase()
    let found = this.byName.get(folded)
    if (!found) {
      found = { name, entries: {} }
      this.byName.set(folded, found)
      this.doc.sections.push(found)
    }
    return found
  }

  put(entries, key, value) {
    entries[key] = value
  }
}

/** One section's entries, matched on the name without regard to case. */
export function getSection(doc, name) {
  const folded = String(name).toLowerCase()
  const found = doc.sections.find((s) => s.name.toLowerCase() === folded)
  return found === undefined ? undefined : found.entries
}
