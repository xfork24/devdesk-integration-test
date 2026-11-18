export function greeting(name, options = undefined) {
  if (typeof name !== 'string') {
    throw new TypeError('name must be a primitive string');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new TypeError('name must not be empty');
  }
  let prefix = 'Hello';
  if (options !== undefined) {
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
      throw new TypeError('options must be a plain object');
    }
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('options must be a plain object');
    }
    if (Object.prototype.hasOwnProperty.call(options, 'prefix')) {
      const value = options.prefix;
      if (typeof value !== 'string') {
        throw new TypeError('prefix must be a primitive string');
      }
      prefix = value.trim();
      if (prefix.length === 0) {
        throw new TypeError('prefix must not be empty');
      }
    }
  }
  return `${prefix}, ${trimmed}!`;
}
