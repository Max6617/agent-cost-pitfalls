/**
 * preset-spec — the declarative definition of the optimized presets.
 *
 * make-presets.mjs copies a shipped preset and applies these edits, so the whole
 * preset set is reproducible from a clean DSH install instead of being a
 * one-off hand edit. Persona text lives in ./personas/<id>.txt.
 *
 * Every operation is asserted to match exactly once; a drifted upstream preset
 * fails loudly rather than producing a silently wrong composition.
 */

export const BASE = {
  'standard-opt': 'standard',
  'ptc-opt': 'ptc',
  'research': 'standard',
  'economy': 'ptc',
  'ptc-router': 'ptc',
}

export const META = {
  'ptc-opt': { name: 'PTC (optimized)', order: 5,
    description: 'PTC mode with token discipline - batched run_code programs, a tighter tool-result pruner, and no goal/ralph rows. The everyday multi-step coding mode.' },
  'standard-opt': { name: 'Standard (optimized)', order: 6,
    description: 'Standard mode with token discipline - narrow searches, subagent delegation for broad reads, a tighter tool-result pruner, and no goal/ralph rows.' },
  'research': { name: 'Research', order: 7,
    description: 'Read-only investigation mode - source-grounded claims, per-source subagent fan-out, source budgeting, and a cited written deliverable.' },
  'economy': { name: 'Economy', order: 8,
    description: 'Cheapest useful mode - PTC presentation over fs, shell and web only. No skills, subagents, jobs, todos, planning or goals.' },
  'ptc-router': { name: 'PTC + router', order: 9,
    description: 'PTC mode plus the deterministic decision layer - one decision per input picks a persona band and a model tier, and escalates on observed stalls. No model call, no API key.' },
}

/** The persona block every shipped preset opens with. */
export const PERSONA_FIND =
  '    suffix: Your working directory is {{cwd}}.\n' +
  '    prefix: >-\n' +
  '      You are a coding agent powered by the {{model}} model.'

const TIGHTEN = [[
  '        thresholdChars: 8192\n        headChars: 4096\n        tailChars: 1024',
  '        thresholdChars: 6000\n        headChars: 3000\n        tailChars: 800',
  'tighter tool-result pruner (8192/4096/1024 -> 6000/3000/800)',
]]

const NO_GOALS = [
  ["- id: command-goal\n  name: '@deepseek-ai/dsh-command-goal'\n\n- id: tool-goal\n  name: '@deepseek-ai/dsh-tool-goal'",
   "- id: command-goal\n  name: '@deepseek-ai/dsh-command-goal'\n  disabled: true\n\n- id: tool-goal\n  name: '@deepseek-ai/dsh-tool-goal'\n  disabled: true",
   'goal rows disabled'],
  ["    - id: tool-ralph\n      name: '@deepseek-ai/dsh-tool-ralph'\n      config:",
   "    - id: tool-ralph\n      name: '@deepseek-ai/dsh-tool-ralph'\n      disabled: true\n      config:",
   'ralph disabled'],
]

const NO_WORKFLOW = [[
  "    - id: tool-workflow\n      name: '@deepseek-ai/dsh-tool-workflow'",
  "    - id: tool-workflow\n      name: '@deepseek-ai/dsh-tool-workflow'\n      disabled: true",
  'workflow disabled',
]]

// Economy disables individual rows rather than the cordis:group holding them:
// per-row 'disabled' is the pattern the shipped presets use for optional rows.
const ECONOMY_ROWS = [
  ["- id: tool-jobs\n  name: '@deepseek-ai/dsh-tool-jobs'",
   "- id: tool-jobs\n  name: '@deepseek-ai/dsh-tool-jobs'\n  disabled: true", 'jobs off'],
  ["- id: skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n\n- id: tool-skill\n  name: '@deepseek-ai/dsh-tool-skill'",
   "- id: skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n  disabled: true\n\n- id: tool-skill\n  name: '@deepseek-ai/dsh-tool-skill'\n  disabled: true", 'skills off'],
  ["- id: tool-todo\n  name: '@deepseek-ai/dsh-tool-todo'",
   "- id: tool-todo\n  name: '@deepseek-ai/dsh-tool-todo'\n  disabled: true", 'todo off'],
  ["    - id: tool-subagent-control\n      name: '@deepseek-ai/dsh-tool-subagent-control'",
   "    - id: tool-subagent-control\n      name: '@deepseek-ai/dsh-tool-subagent-control'\n      disabled: true", 'subagent-control off'],
  ["    - id: tool-subagent-list-agents\n      name: '@deepseek-ai/dsh-tool-subagent-control/list-agents'",
   "    - id: tool-subagent-list-agents\n      name: '@deepseek-ai/dsh-tool-subagent-control/list-agents'\n      disabled: true", 'list-agents off'],
  ["    - id: tool-subagent\n      name: '@deepseek-ai/dsh-tool-subagent'\n      config:",
   "    - id: tool-subagent\n      name: '@deepseek-ai/dsh-tool-subagent'\n      disabled: true\n      config:", 'subagent off'],
  ["    - id: tool-subagent-fork\n      name: '@deepseek-ai/dsh-tool-subagent'\n      config:",
   "    - id: tool-subagent-fork\n      name: '@deepseek-ai/dsh-tool-subagent'\n      disabled: true\n      config:", 'subagent_fork off'],
  ["    - id: workflow-worker-thread\n      name: '@deepseek-ai/dsh-workflow-worker-thread'",
   "    - id: workflow-worker-thread\n      name: '@deepseek-ai/dsh-workflow-worker-thread'\n      disabled: true", 'workflow engine off'],
  ["    - id: plan-mode\n      name: '@deepseek-ai/dsh-plan-mode'",
   "    - id: plan-mode\n      name: '@deepseek-ai/dsh-plan-mode'\n      disabled: true", 'plan mode off'],
]

export const OPS = {
  'ptc-opt': [...TIGHTEN, ...NO_GOALS],
  'standard-opt': [...TIGHTEN, ...NO_GOALS],
  'research': [...TIGHTEN, ...NO_GOALS, ...NO_WORKFLOW],
  'economy': [...TIGHTEN, ...NO_GOALS, ...ECONOMY_ROWS],
  'ptc-router': [...TIGHTEN, ...NO_GOALS],
}

/** Files copied into a preset directory alongside its composition. A preset
 *  resolves './x.mjs' against its own directory, so a preset that mounts a local
 *  plugin must carry that plugin next to agent.cordis.yml. */
export const EXTRA_FILES = {
  'ptc-router': ['router-core.mjs', 'router-plugin.mjs'],
}

/** YAML appended after the edits above. */
export const APPEND = {
  'ptc-router': [
    '',
    '# ---- decision layer -------------------------------------------------------',
    '# Deterministic only: no model call, no API key, no network. The plugin',
    '# degrades to "no routing" on any error, so it cannot break a run.',
    '# Set ledgerPath to an absolute file to record every decision (needed to',
    '# write up hypothesis H2). See router/README.md.',
    '- id: router-det',
    "  name: './router-plugin.mjs'",
    '  config:',
    '    costMode: cost-first',
    '    minChars: 24',
    '    injectPersona: true',
    '    ledgerPath: null',
    '    routes:',
    '      cheap:    { provider: deepseek-official, model: deepseek-flash, reasoningEffort: off }',
    '      standard: { provider: deepseek-official, model: deepseek-flash, reasoningEffort: high }',
    '      strong:   { provider: deepseek-official, model: deepseek-pro,   reasoningEffort: high }',
    '',
  ].join('\n'),
}
