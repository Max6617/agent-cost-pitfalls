/**
 * format.js - display helpers shared by the screens. No ordering logic here.
 */
export function formatPriority(priority) {
  return priority == null ? 'unset' : 'P' + priority
}

export function formatCreated(createdAt) {
  return createdAt == null ? '-' : String(createdAt).slice(0, 10)
}

export function summarize(rows) {
  let triaged = 0
  let undated = 0
  for (const row of rows) {
    if (row.priority != null) triaged++
    if (row.createdAt == null) undated++
  }
  return { total: rows.length, triaged, untriaged: rows.length - triaged, undated }
}
