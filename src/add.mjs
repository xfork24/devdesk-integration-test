export function add(a, b) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
    throw new TypeError('Both arguments must be safe integers');
  }

  const result = a + b;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError('The sum must be a safe integer');
  }

  return result;
}
