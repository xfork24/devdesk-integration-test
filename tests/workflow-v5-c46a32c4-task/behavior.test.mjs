import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { greeting } from '../../src/workflow-v5-b55d65d7/greeting.mjs';

// Task-owned independent assertions. No product stub, network, or dependencies.
const whitespace = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680' +
  '\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
const invalidNames = [undefined, null, 0, -1, NaN, Infinity, false, true,
  Symbol('name'), 1n, {}, [], ['Ada'], () => 'Ada', new String('Ada'),
  '', ' ', '\t\r\n', whitespace];
function snapshot(object) {
  return { keys: Reflect.ownKeys(object), prototype: Object.getPrototypeOf(object),
    descriptors: Object.getOwnPropertyDescriptors(object) };
}
function rejectsTypeError(operation, message) {
  assert.throws(operation, { name: 'TypeError', message });
}

test('TC01 AC-COMPAT: export arity, defaults and original name messages', () => {
  assert.equal(greeting.length, 1);
  for (const options of [undefined, {}, Object.create(null)]) {
    assert.equal(greeting(' Ada ', options), 'Hello, Ada!');
  }
  assert.equal(greeting(' Ada '), 'Hello, Ada!');
  rejectsTypeError(() => greeting(), 'name must be a primitive string');
  for (const name of invalidNames) {
    rejectsTypeError(() => greeting(name), typeof name === 'string'
      ? 'name must not be empty' : 'name must be a primitive string');
  }
});

test('TC02 AC-PREFIX: exact output, full trim whitespace and retained content', () => {
  for (const [name, prefix, expected] of [
    [' Ada ', ' Hi ', 'Hi, Ada!'],
    [whitespace + 'Ada' + whitespace, whitespace + 'Hi' + whitespace, 'Hi, Ada!'],
    [' Ada  Lovelace ', ' Good\t day ', 'Good\t day, Ada  Lovelace!'],
    [' aDa, 世界! e\u0301 ', ' 你好! ', '你好!, aDa, 世界! e\u0301!'],
    ['\u200b', '\u200b', '\u200b, \u200b!'],
    ['A', 'H', 'H, A!'],
  ]) assert.equal(greeting(name, { prefix }), expected);
  assert.equal(greeting(whitespace + 'Ada' + whitespace), 'Hello, Ada!');
});

test('TC03 AC-PREFIX: allowed prototypes and own property variants', () => {
  const nullOptions = Object.create(null);
  nullOptions.prefix = ' Hey ';
  const hidden = Object.defineProperty({}, 'prefix', { value: ' Welcome ', enumerable: false });
  const shadowed = { prefix: ' Hi ', hasOwnProperty: null };
  for (const [options, expected] of [[nullOptions, 'Hey, Ada!'], [hidden, 'Welcome, Ada!'],
    [shadowed, 'Hi, Ada!']]) assert.equal(greeting('Ada', options), expected);
});

test('TC04 AC-PREFIX: extra fields and their getters are never read', () => {
  let reads = 0;
  const options = Object.defineProperties({}, {
    unused: { enumerable: true, get() { reads++; throw new Error('unused'); } },
    [Symbol('unused')]: { enumerable: true, get() { reads++; throw new Error('symbol'); } },
    hasOwnProperty: { get() { reads++; throw new Error('shadow'); } },
    toString: { get() { reads++; throw new Error('conversion'); } },
  });
  assert.equal(greeting('Ada', options), 'Hello, Ada!');
  Object.defineProperty(options, 'prefix', { value: 'Hi' });
  assert.equal(greeting('Ada', options), 'Hi, Ada!');
  assert.equal(reads, 0);
});

test('TC05 AC-PREFIX: inherited prefix ignored; own prefix wins', { concurrency: false }, () => {
  // Synchronous and isolated to this test-file process. Always restore global state.
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'prefix');
  let reads = 0;
  try {
    Object.defineProperty(Object.prototype, 'prefix', {
      configurable: true, get() { reads++; throw new Error('inherited prefix read'); },
    });
    assert.equal(greeting('Ada', {}), 'Hello, Ada!');
    assert.equal(greeting('Ada', Object.create(null)), 'Hello, Ada!');
    const own = Object.defineProperty({}, 'prefix', { value: 'Hi' });
    assert.equal(greeting('Ada', own), 'Hi, Ada!');
    const invalid = Object.defineProperty({}, 'prefix', { value: undefined });
    assert.throws(() => greeting('Ada', invalid), TypeError);
    assert.equal(reads, 0);
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'prefix', previous);
    else delete Object.prototype.prefix;
  }
});

test('TC06 AC-OPTIONS: rejects all invalid options categories before prefix access', () => {
  class Options {}
  const invalid = [null, [], ['Hi'], '', 'Hi', 0, NaN, Infinity, false, true,
    Symbol('options'), 1n, () => {}, new String('Hi'), new Number(1), new Boolean(true),
    new Date(0), /Hi/, new Map(), new Set(), new Options(),
    Object.create({ prefix: 'Hi' }), Object.create(Object.create(null)), runInNewContext('({})')];
  for (const options of invalid) assert.throws(() => greeting('Ada', options), TypeError);
  let reads = 0;
  for (const options of [[], new Options(), Object.create({})]) {
    Object.defineProperty(options, 'prefix', { get() { reads++; throw new Error('read'); } });
    assert.throws(() => greeting('Ada', options), TypeError);
  }
  assert.equal(reads, 0);
});

test('TC07 AC-OPTIONS: explicit invalid prefix never falls back or coerces', () => {
  let reads = 0;
  const poisoned = Object.defineProperties({}, {
    trim: { get() { reads++; throw new Error('trim'); } },
    toString: { get() { reads++; throw new Error('toString'); } },
    valueOf: { get() { reads++; throw new Error('valueOf'); } },
    [Symbol.toPrimitive]: { get() { reads++; throw new Error('coercion'); } },
  });
  for (const prefix of [undefined, null, 0, 42, NaN, Infinity, false, true, Symbol('prefix'),
    1n, {}, [], ['Hi'], () => 'Hi', new String('Hi'), poisoned, '', ' ', '\t\n', whitespace]) {
    for (const options of [{ prefix }, Object.assign(Object.create(null), { prefix })]) {
      assert.throws(() => greeting('Ada', options), TypeError);
    }
  }
  assert.equal(reads, 0);
});

test('TC08 AC-OPTIONS: getter read once with original receiver, success and failure', () => {
  for (const value of [' Hi ', undefined, null, 1, '', whitespace, new String('Hi')]) {
    let reads = 0;
    let receiver;
    const options = Object.defineProperty({}, 'prefix', { get() {
      receiver = this;
      reads++;
      // A second read could otherwise turn an invalid value into a valid value.
      return reads === 1 ? value : 'Wrong';
    } });
    if (typeof value === 'string' && value.trim()) {
      assert.equal(greeting('Ada', options), 'Hi, Ada!');
    } else assert.throws(() => greeting('Ada', options), TypeError);
    assert.equal(reads, 1);
    assert.equal(receiver, options);
  }
});

test('TC09 AC-OPTIONS: original getter and reflection exceptions propagate once', () => {
  const sentinel = new Error('sentinel');
  let reads = 0;
  const options = Object.defineProperty({}, 'prefix', { get() { reads++; throw sentinel; } });
  assert.throws(() => greeting('Ada', options), error => error === sentinel);
  assert.equal(reads, 1);
  for (const trap of ['getPrototypeOf', 'getOwnPropertyDescriptor', 'get']) {
    let calls = 0;
    const proxy = new Proxy({ prefix: 'Hi' }, {
      [trap]() { calls++; throw sentinel; },
    });
    assert.throws(() => greeting('Ada', proxy), error => error === sentinel);
    assert.equal(calls, 1);
  }
});

test('TC10 AC-COMPAT AC-OPTIONS: invalid name never touches options or name properties', () => {
  const accesses = [];
  const traps = Object.fromEntries(['getPrototypeOf', 'getOwnPropertyDescriptor', 'get',
    'has', 'ownKeys', 'set', 'defineProperty', 'deleteProperty', 'setPrototypeOf',
    'isExtensible', 'preventExtensions'].map(trap => [trap, () => {
    accesses.push(trap); throw new Error('options touched');
  }]));
  const options = new Proxy({}, traps);
  const poisonedName = new Proxy({}, { get() { accesses.push('name.get'); throw new Error('name read'); } });
  for (const name of [...invalidNames, poisonedName]) {
    rejectsTypeError(() => greeting(name, options), typeof name === 'string'
      ? 'name must not be empty' : 'name must be a primitive string');
  }
  assert.deepEqual(accesses, []);
});

test('TC11 AC-OPTIONS: valid Proxy follows prototype, own check, single get order', () => {
  const events = [];
  const options = new Proxy({ prefix: ' Hi ' }, {
    getPrototypeOf(target) { events.push('prototype'); return Reflect.getPrototypeOf(target); },
    getOwnPropertyDescriptor(target, key) {
      events.push('own:' + String(key)); return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) { events.push('get:' + String(key)); return Reflect.get(target, key, receiver); },
    ownKeys() { throw new Error('must not enumerate'); },
    set() { throw new Error('must not write'); },
  });
  assert.equal(greeting(' Ada ', options), 'Hi, Ada!');
  assert.deepEqual(events, ['prototype', 'own:prefix', 'get:prefix']);
});

test('TC12 AC-PREFIX AC-OPTIONS: success and failure leave descriptors and prototypes unchanged', () => {
  const sentinel = new Error('getter failed');
  const inputs = [{}, { prefix: ' Hi ' }, { prefix: undefined }, { prefix: '' },
    Object.create(null), Object.assign(Object.create(null), { prefix: 'Hi' }),
    Object.defineProperty({}, 'prefix', { get() { return 'Hi'; } }),
    Object.defineProperty({}, 'prefix', { get() { throw sentinel; } })];
  for (const base of inputs) {
    for (const seal of [object => object, Object.seal, Object.freeze]) {
      const options = Object.create(Object.getPrototypeOf(base), Object.getOwnPropertyDescriptors(base));
      seal(options);
      const before = snapshot(options);
      const descriptor = Object.getOwnPropertyDescriptor(options, 'prefix');
      if (!descriptor) assert.equal(greeting('Ada', options), 'Hello, Ada!');
      else if (descriptor.get === Object.getOwnPropertyDescriptor(inputs[7], 'prefix').get) {
        assert.throws(() => greeting('Ada', options), error => error === sentinel);
      } else if (descriptor.get || descriptor.value === ' Hi ' || descriptor.value === 'Hi') {
        assert.equal(greeting('Ada', options), 'Hi, Ada!');
      } else assert.throws(() => greeting('Ada', options), TypeError);
      assert.deepEqual(snapshot(options), before);
      assert.throws(() => greeting('', options), TypeError);
      assert.deepEqual(snapshot(options), before);
    }
  }
});

test('TC13 AC-PREFIX AC-OPTIONS: calls reread current input, recover from failures and support reentry', () => {
  let reads = 0;
  const options = Object.defineProperty({}, 'prefix', { get() {
    reads++;
    assert.equal(greeting(' Inner ', { prefix: ' Nested ' }), 'Nested, Inner!');
    return reads === 2 ? undefined : ` P${reads} `;
  } });
  assert.equal(greeting('Ada', options), 'P1, Ada!');
  assert.throws(() => greeting('Ada', options), TypeError);
  assert.equal(greeting('Grace', options), 'P3, Grace!');
  assert.equal(reads, 3);
  const mutable = { prefix: 'Hi' };
  assert.equal(greeting('Ada', mutable), 'Hi, Ada!');
  mutable.prefix = 'Welcome';
  assert.equal(greeting('Ada', mutable), 'Welcome, Ada!');
  delete mutable.prefix;
  assert.equal(greeting('Ada', mutable), 'Hello, Ada!');
  assert.equal(greeting(' Ada '), 'Hello, Ada!');
});
