export function getAverage(numbers: number[]) {
  return numbers.reduce((total, n) => total + n, 0) / numbers.length;
}