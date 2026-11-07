/**
 * The plan as the release ticket reads it.
 *
 * One line per step, in plan order, plus whatever the planner had to say about
 * the release. The release bot posts this verbatim.
 */

function stepLine(step, index) {
  const where = step.table ? ' on ' + step.table : ''
  const size = step.batches.length
    ? step.batches.length + ' batches, ' + step.batches[step.batches.length - 1].rows + ' rows in the last'
    : 'one statement'
  return (index + 1) + '. ' + step.id + ' ' + step.kind + where + ' - ' + size + ', ' + step.estimateMs + ' ms'
}

export function renderPlan(plan) {
  const lines = ['status: ' + plan.status]

  if (plan.cycle) lines.push('cycle: ' + plan.cycle.join(' -> '))
  for (const error of plan.errors) lines.push('error: ' + error.code + ' ' + error.migration + ' - ' + error.detail)
  plan.steps.forEach((step, index) => lines.push(stepLine(step, index)))
  if (plan.steps.length) lines.push('total: ' + plan.estimate.totalMs + ' ms')
  for (const warning of plan.warnings) lines.push('warning: ' + warning.code + ' ' + warning.migration)
  if (plan.skipped.length) lines.push('skipped: ' + plan.skipped.join(', '))
  if (plan.rollback.steps.length) {
    lines.push('rollback: ' + plan.rollback.steps.map((step) => step.id).join(', '))
  }
  if (plan.rollback.skipped.length) {
    lines.push('rollback leaves behind: ' + plan.rollback.skipped.join(', '))
  }
  return lines.join('\n')
}
