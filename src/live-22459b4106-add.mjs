export function add(a, b) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
    throw new TypeError('Both inputs must be safe integers');
  }

  const result = a + b;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError('Sum exceeds the safe integer range');
  }

  return result;
}
