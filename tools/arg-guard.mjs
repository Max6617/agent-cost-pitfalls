/**
 * arg-guard.mjs - the guard that catches an unsubstituted TEMPLATE placeholder, without reading the
 * prompt as a template.
 *
 * WHY IT IS ITS OWN MODULE. It lived inline in tools/run-experiment.mjs, which is a script that runs
 * on import - so the guard could not be tested, and a guard that cannot be tested was wrong: it
 * scanned every SUBSTITUTED argument for /\{[a-zA-Z]+\}/. tasks-b/multi-file-locale-fallback is a
 * task about placeholder leaking, and its prompt says 'Placeholders like {name} are also leaking into
 * rendered pages'. Four external harnesses refused to launch (8 cells), the records carried an error,
 * and the verify stage refused the sign-off for the whole 800-cell matrix.
 *
 * THE RULE. A template placeholder is a KNOWN token in the harness's own argument template
 * (harnesses.mjs), and the bug class is 'the template's {key} never got substituted'. So the check
 * compares each template element with the argument it produced: if the placeholder is still there in
 * both, substitution failed. A prompt is data at every position and can contain anything.
 */

/** The placeholders the substitution chain in run-experiment.mjs's commandFor() resolves. */
export const TEMPLATE_PLACEHOLDER = /\{(prompt|model|provider|key|baseUrl|configDir|timeoutSec|workdir)\}/

/**
 * @param {string[]} template  the harness's argument template, before substitution
 * @param {string[]} args      the same array after substitution (same length)
 */
export function assertNoUnsubstituted (template, args) {
  if (template.length !== args.length) {
    throw new Error('arg-guard: template has ' + template.length + ' elements and the command line has ' +
      args.length + ' - the guard cannot tell which argument came from which placeholder')
  }
  for (let i = 0; i < template.length; i++) {
    if (TEMPLATE_PLACEHOLDER.test(template[i]) && TEMPLATE_PLACEHOLDER.test(args[i])) {
      throw new Error('unsubstituted placeholder in harness args: ' + JSON.stringify(args[i]))
    }
  }
}