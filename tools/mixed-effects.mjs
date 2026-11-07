/**
 * mixed-effects.mjs - a random-intercept linear mixed model, fitted by REML.
 *
 * WHY THIS EXISTS. PRE-REGISTRATION.md files H1 as
 *
 *     D_ij = b0 + b1*S_ij + u_i + e_ij,   u_i ~ N(0, s_u^2),  i = task
 *
 * and notes/plans/JOURNAL-PLAN.md section 3 names the model: "linear mixed-effects with task as a random
 * intercept ... A paired t-test ignores task heterogeneity; a mixed model does not." The tool that
 * executes the filed rules (tools/hypotheses.mjs) approximates that equation with a WITHIN-TASK
 * demeaned OLS and labels it "random-intercept-equivalent"; the pooled OLS it labels the primary
 * specification has no task term at all. Neither is the filed model, and the difference is not
 * cosmetic: a pooled regression treats repeated runs of one task as independent, which understates
 * the standard error of any predictor that varies BETWEEN tasks - which is exactly what the
 * output-share predictor S in H1 partly does.
 *
 * WHAT THIS IS. One random intercept, any number of fixed effects, REML. With lambda = s_u^2/s_e^2
 * the covariance is block diagonal, one block per group:
 *
 *     V_g = I + lambda * J          V_g^-1 = I - lambda/(1 + lambda*n_g) * J
 *     log|V_g| = log(1 + lambda*n_g)
 *
 * so the profile REML criterion is computable in O(n*p) per value of lambda with no n-by-n matrix
 * ever formed, and the whole fit is a one-dimensional optimisation:
 *
 *     -2*logREML(lambda) = sum_g log(1+lambda*n_g) + log|X'V^-1 X| + (n-p)*log(r'V^-1 r)
 *
 * with beta from GLS and s_e^2 = r'V^-1 r / (n-p). A coarse grid brackets the optimum and a golden
 * section refines it; both are deterministic, so two runs give the same answer to the last bit.
 *
 * WHAT IT IS NOT. Not a general mixed-model package: no random slopes, no crossed effects, no
 * REML-vs-ML switch, no Satterthwaite denominator degrees of freedom. Every interval this study
 * reports from it is either model-based (from the GLS covariance) or bootstrapped over tasks, and
 * both are labelled as such at the point of use.
 *
 * A degenerate design is REPORTED, not guessed: if the fixed-effect design is rank deficient at
 * the optimum (a constant predictor, collinear dummies), the fit returns singular: true with NaN
 * coefficients rather than a number that a table would then print.
 */

/** Symmetric positive-definite solve via Cholesky. Returns null when A is not PD. */
function chol (A) {
  const n = A.length
  const L = Array.from({ length: n }, () => new Float64Array(n))
  let logdet = 0
  let scale = 0
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) scale = Math.max(scale, Math.abs(A[i][j]))
  if (scale === 0) return null
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      if (i === j) {
        if (s <= 1e-12 * scale) return null      // not positive definite (or numerically singular)
        L[i][j] = Math.sqrt(s)
        logdet += Math.log(L[i][j])
      } else {
        L[i][j] = s / L[j][j]
      }
    }
  }
  // |A| = prod(L_ii^2), so log|A| = 2 * sum(log L_ii). Returning the un-doubled sum understates
  // the determinant penalty by half, which biases the variance-ratio search upward: the first
  // version of this file did exactly that and estimated sigma_u = 0.92 on data with no group
  // structure at all. The dense-reference test is what caught it.
  return { L, logdet: 2 * logdet }
}

/** Solve A x = b from a Cholesky factor. */
function cholSolve ({ L }, b) {
  const n = L.length
  const yv = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= L[i][k] * yv[k]
    yv[i] = s / L[i][i]
  }
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = yv[i]
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]
    x[i] = s / L[i][i]
  }
  return x
}

/** OLS with an intercept, for the comparisons this study reports beside the mixed fit. */
export function olsReference (y, X) {
  return fitRandomIntercept(y, X, y.map((_, i) => 'g' + i), { forceLambda: 0 })
}

/**
 * @param {number[]} y response
 * @param {number[][]} X fixed-effect covariates, one row per observation, WITHOUT an intercept
 * @param {(string|number)[]} groups the random-intercept grouping (here: task)
 * @param {{forceLambda?: number, gridPoints?: number}} [opts]
 * @returns {{beta: number[], se: number[], sigmaU: number, sigmaE: number, icc: number,
 *            lambda: number, n: number, p: number, nGroups: number, reml: number,
 *            converged: boolean, singular: boolean}}
 */
export function fitRandomIntercept (y, X, groups, opts = {}) {
  const n = y.length
  const p = (X[0]?.length ?? 0) + 1
  const design = X.map((row, i) => { const r = new Float64Array(p); r[0] = 1; for (let j = 0; j < row.length; j++) r[j + 1] = row[i === -1 ? 0 : j]; return r })
  // group index and sizes
  const index = new Map()
  const members = []
  for (let i = 0; i < n; i++) {
    const key = String(groups[i])
    if (!index.has(key)) { index.set(key, members.length); members.push([]) }
    members[index.get(key)].push(i)
  }
  const G = members.length
  const sizes = members.map((m) => m.length)

  const solveAt = (lambda) => {
    // M = V^-1 X, Vy = V^-1 y, logdet(V), all block-wise
    const M = Array.from({ length: n }, () => new Float64Array(p))
    const Vy = new Float64Array(n)
    let logdet = 0
    for (const mem of members) {
      const ng = mem.length
      const c = lambda / (1 + lambda * ng)
      logdet += Math.log(1 + lambda * ng)
      const colSum = new Float64Array(p)
      let ySum = 0
      for (const i of mem) { for (let j = 0; j < p; j++) colSum[j] += design[i][j]; ySum += y[i] }
      for (const i of mem) {
        for (let j = 0; j < p; j++) M[i][j] = design[i][j] - c * colSum[j]
        Vy[i] = y[i] - c * ySum
      }
    }
    const A = Array.from({ length: p }, () => new Float64Array(p))
    const b = new Float64Array(p)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        b[j] += design[i][j] * Vy[i]
        for (let k = j; k < p; k++) A[j][k] += design[i][j] * M[i][k]
      }
    }
    for (let j = 0; j < p; j++) for (let k = 0; k < j; k++) A[j][k] = A[k][j]
    const Aarr = A.map((r) => Array.from(r))
    const ch = chol(Aarr)
    if (!ch) return null
    const beta = cholSolve(ch, b)
    // r'V^-1 r
    // r'V^-1 r = sum_g [ sum_i r_i^2 - c_g * (sum_i r_i)^2 ]. The correction is ONCE PER GROUP:
    // applying it inside the per-observation loop multiplies it by the group size, which is what
    // the first version did (rVr came out 3.5x too small here, and the fit chased it).
    let rVr = 0
    for (const mem of members) {
      const ng = mem.length
      const c = lambda / (1 + lambda * ng)
      let sum = 0
      let gr = 0
      for (const i of mem) {
        let ri = y[i]
        for (let j = 0; j < p; j++) ri -= design[i][j] * beta[j]
        sum += ri
        gr += ri * ri
      }
      rVr += gr - c * sum * sum
    }
    const crit = logdet + ch.logdet + (n - p) * Math.log(Math.max(rVr, 1e-300))
    return { beta, rVr, crit, ch, logdet }
  }

  // ---- optimise over log10(lambda) -----------------------------------------------------------
  let lambda = opts.forceLambda ?? 0
  let best = null
  let converged = false
  if (opts.forceLambda === undefined) {
    const grid = opts.gridPoints ?? 161
    const lo = -10, hi = 10
    let bestL = lo, bestCrit = Infinity
    for (let i = 0; i < grid; i++) {
      const l = lo + (hi - lo) * i / (grid - 1)
      const s = solveAt(Math.pow(10, l))
      if (s && s.crit < bestCrit) { bestCrit = s.crit; bestL = l }
    }
    const step = (hi - lo) / (grid - 1)
    let a = bestL - step, b = bestL + step
    const phi = (Math.sqrt(5) - 1) / 2
    let c = b - phi * (b - a), d = a + phi * (b - a)
    let fc = solveAt(Math.pow(10, c)), fd = solveAt(Math.pow(10, d))
    for (let it = 0; it < 80 && fc && fd; it++) {
      if (fc.crit < fd.crit) { b = d; d = c; fd = fc; c = b - phi * (b - a); fc = solveAt(Math.pow(10, c)) }
      else { a = c; c = d; fc = fd; d = a + phi * (b - a); fd = solveAt(Math.pow(10, d)) }
    }
    bestL = (fc && fd) ? (fc.crit < fd.crit ? c : d) : bestL
    lambda = Math.pow(10, bestL)
    if (lambda < 1e-9) lambda = 0
    converged = true
  }
  best = solveAt(lambda)
  if (!best) {
    return { beta: new Array(p).fill(NaN), se: new Array(p).fill(NaN), sigmaU: NaN, sigmaE: NaN, icc: NaN, lambda, n, p, nGroups: G, reml: NaN, converged: false, singular: true }
  }
  const sigmaE2 = best.rVr / (n - p)
  const covDiag = []
  const inv = invertSym(best.ch)
  for (let j = 0; j < p; j++) covDiag.push(sigmaE2 * inv[j][j])
  const sigmaE = Math.sqrt(Math.max(sigmaE2, 0))
  const sigmaU = Math.sqrt(Math.max(lambda * sigmaE2, 0))
  return {
    beta: Array.from(best.beta), se: covDiag.map((v) => Math.sqrt(Math.max(v, 0))),
    sigmaU, sigmaE, icc: sigmaU * sigmaU + sigmaE * sigmaE > 0 ? (sigmaU * sigmaU) / (sigmaU * sigmaU + sigmaE * sigmaE) : 0,
    lambda, n, p, nGroups: G, reml: best.crit, converged, singular: false,
  }
}

/** A^-1 from a Cholesky factor, by solving for each unit vector. */
function invertSym ({ L }) {
  const p = L.length
  const out = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let k = 0; k < p; k++) {
    const e = new Float64Array(p); e[k] = 1
    const x = cholSolve({ L }, e)
    for (let i = 0; i < p; i++) out[i][k] = x[i]
  }
  return out
}
