let counter = 0

/** Stable, collision-free ids for jobs, cache values and reservations. */
export function nextId(prefix) {
  counter += 1
  return prefix + '-' + String(counter).padStart(5, '0')
}

export function resetIds() {
  counter = 0
}
