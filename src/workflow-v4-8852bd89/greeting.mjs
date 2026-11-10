export function greeting(name) {
  if (typeof name !== 'string') {
    throw new TypeError('Name must be a primitive string');
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new TypeError('Name must not be blank');
  }

  return `Hello, ${trimmed}!`;
}
