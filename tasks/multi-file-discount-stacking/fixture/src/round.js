/**
 * Money rounding.
 *
 * Half away from zero, to two places. The values being rounded are rarely exact
 * in binary, so the scaled value is nudged before the rounding: without it 1.005
 * rounds down and 2.675 rounds up, and neither is what the customer expects.
 */
export function roundMoney(value, dp = 2) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** dp
  const scaled = value * factor
  const sign = scaled < 0 ? -1 : 1
  return (sign * Math.round(Math.abs(scaled) + 1e-9)) / factor
}
