export function greeting(name) {
  if (typeof name !== 'string') {
    throw new TypeError('Name must be a string');
  }

  const trimmedName = name.trim();
  if (trimmedName === '') {
    throw new TypeError('Name must not be blank');
  }

  return `Hello, ${trimmedName}!`;
}
