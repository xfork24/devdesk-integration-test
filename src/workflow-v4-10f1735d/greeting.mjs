/**
 * Return a greeting for a non-empty, trimmed primitive string.
 * @param {string} name
 * @returns {string}
 * @throws {TypeError} If name is not a string or is empty after trimming.
 */
export function greeting(name) {
  if (typeof name !== 'string') {
    throw new TypeError('name must be a string');
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new TypeError('name must not be empty');
  }

  return `Hello, ${trimmed}!`;
}
