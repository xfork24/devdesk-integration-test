export function greeting(name) {
  if (typeof name !== 'string') {
    throw new TypeError('Name must be a string');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new TypeError('Name must not be empty');
  }
  return `Hello, ${trimmed}!`;
}
