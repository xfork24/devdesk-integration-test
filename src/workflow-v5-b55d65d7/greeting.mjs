export function greeting(name) {
  if (typeof name !== 'string') {
    throw new TypeError('name must be a primitive string');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new TypeError('name must not be empty');
  }
  return `Hello, ${trimmed}!`;
}
