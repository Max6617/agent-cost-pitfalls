export function sum(numbers) {
  return numbers.reduce((total, n) => total + n, 0)
}

export function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}
