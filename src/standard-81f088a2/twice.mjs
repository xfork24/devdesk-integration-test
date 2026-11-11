export function twice(n) {
  if (!Number.isFinite(n)) {
    throw new TypeError('Expected a finite number');
  }
  return n * 2;
}
