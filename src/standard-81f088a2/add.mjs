export function add(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new TypeError('Expected finite numbers');
  }
  return a + b;
}
