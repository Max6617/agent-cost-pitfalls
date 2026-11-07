export function add(a, b) {
  // BUG (deliberate): subtraction instead of addition. The fixture must actually
  // fail its tests, or every run "solves" the task and the experiment measures
  // nothing. An earlier version of this fixture was already correct, so all runs
  // passed regardless of what the agent did.
  return a - b
}

export function sub(a, b) {
  return a - b
}
