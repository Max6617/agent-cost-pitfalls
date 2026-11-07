/**
 * arms — what the DSH side of the matrix actually compares.
 *
 * Written after discovering that PRESETS DO NOT WORK IN A HEADLESS PROFILE.
 * The preset roster is contributed by @deepseek-ai/dsh-web-app, not dsh-base, so a
 * headless profile composes none and the obvious patch
 *
 *     - id: agent-presets
 *       config: { default: ptc-opt }
 *
 * warns "patch: entry agent-presets not found" and is skipped. An id-less insert
 * does add the roster - but the headless profile also does not carry the web
 * app's "disabled: true" patches on the tool rows, so the preset's tool set is not
 * what a web session gets anyway. Presets are a web-surface abstraction.
 *
 * The presentation axis has a cleaner lever, confirmed by measurement:
 *
 *     DSH_TOOLS_MODE=native  ->  25 declared tools, 0.00 PTC sub-calls/call
 *     DSH_TOOLS_MODE=ptc     ->   1 declared tool,  1.00 PTC sub-calls/call
 *
 * So an arm is (presentation mode x policy patch). That is exactly the 2x2 the
 * protocol asks for, expressed in terms the headless profile actually supports.
 */
/**
 * The terseness instruction for the F15 ablation.
 *
 * It goes in the PROMPT, not in a DSH persona patch, for one decisive reason: a
 * prompt suffix applies identically to every harness, whereas a persona patch is
 * DSH-only. An ablation that only works on one system cannot tell us whether the
 * mechanism is general.
 *
 * The claim under test: PTC's cost penalty scales with OUTPUT'S SHARE of the bill.
 * If that is right, cutting output should shrink the penalty. If the penalty is
 * instead a fixed property of code-mode presentation, terseness will not touch it.
 */
export const TERSE =
  'Be concise: give minimal explanation, prefer the smallest correct change, and keep all output short.'

export const DSH_ARMS = [
  { id: 'dsh:native',     mode: 'native', patch: 'shipped.yml',   label: 'native presentation, shipped policy' },
  { id: 'dsh:ptc',        mode: 'ptc',    patch: 'shipped.yml',   label: 'PTC presentation, shipped policy' },
  { id: 'dsh:native-opt', mode: 'native', patch: 'optimized.yml', label: 'native presentation, optimized policy' },
  { id: 'dsh:ptc-opt',    mode: 'ptc',    patch: 'optimized.yml', label: 'PTC presentation, optimized policy' },

  // ---- The F15 ablation. Same presentation and policy as the two arms above; the
  // ONLY difference is a terseness instruction in the prompt. A clean 2x2 on output
  // volume, which is the variable the proposed mechanism turns on.
  { id: 'dsh:native-terse', mode: 'native', patch: 'shipped.yml', promptSuffix: TERSE, label: 'native presentation, terse' },
  { id: 'dsh:ptc-terse',    mode: 'ptc',    patch: 'shipped.yml', promptSuffix: TERSE, label: 'PTC presentation, terse' },
]

/** External harnesses are one arm each: "condition" is a DSH concept. */
export const EXTERNAL_ARMS_FROM_REGISTRY = true
