import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-b55d65d7/greeting.mjs';

// Public-entry assertions owned by the independent Task tester.
// Prototype/trim probes are synchronous, non-concurrent and always restored.
const serial = { concurrency: false };

function observedOptions(target = { prefix: 'Hi' }) {
  const events = [];
  const options = new Proxy(target, {
    getPrototypeOf(value) { events.push('prototype'); return Reflect.getPrototypeOf(value); },
    getOwnPropertyDescriptor(value, key) {
      events.push(['own', key]); return Reflect.getOwnPropertyDescriptor(value, key);
    },
    get(value, key, receiver) {
      events.push(['get', key]); return Reflect.get(value, key, receiver);
    },
  });
  return { options, events };
}

function thrownValue(action, sentinel) {
  // Capture only a callable product operation, never module loading.
  let threw = false;
  let actual;
  try { action(); } catch (error) { threw = true; actual = error; }
  assert.equal(threw, true, 'must throw');
  assert.strictEqual(actual, sentinel, 'must propagate the original thrown value');
}

test('T01 AC-COMPAT/AC-PREFIX: default options and null-prototype objects', serial, () => {
  assert.equal(greeting(' Ada '), 'Hello, Ada!');
  for (const options of [undefined, {}, Object.create(null), { unrelated: 7 }]) {
    assert.equal(greeting(' Ada ', options), 'Hello, Ada!');
  }
  assert.equal(greeting(' Ada ', Object.assign(Object.create(null), { prefix: ' Hi ' })), 'Hi, Ada!');
});

test('T02 AC-PREFIX/AC-COMPAT: exact format, Unicode trim and internal content', serial, () => {
  assert.equal(greeting(' Ada ', { prefix: ' Hi ' }), 'Hi, Ada!');
  assert.equal(greeting('\u00a0\u2003\ufeffAda\u2028\u2029', {
    prefix: '\u00a0\u2003\ufeffSalut\u2028\u2029',
  }), 'Salut, Ada!');
  assert.equal(greeting(' Ada\t\nLovelace ', { prefix: ' Good  day ' }), 'Good  day, Ada\t\nLovelace!');
  assert.equal(greeting(' aDa, 世界! e\u0301 ', { prefix: ' 你好! ' }), '你好!, aDa, 世界! e\u0301!');
  assert.equal(greeting('\u200b', { prefix: '\u200b' }), '\u200b, \u200b!');
});

test('T03 AC-OPTIONS: rejects every invalid options category and prototype', serial, () => {
  class Options { constructor() { this.prefix = 'Hi'; } }
  const invalid = [null, [], ['Hi'], () => {}, '', 'Hi', 0, NaN, Infinity,
    true, false, Symbol('options'), 1n, new String('Hi'), new Number(1),
    new Boolean(true), new Date(0), /Hi/, new Map(), new Set(),
    Object.create({ prefix: 'Hi' }), new Options()];
  for (const options of invalid) assert.throws(() => greeting('Ada', options), TypeError);
});

test('T04 AC-OPTIONS: explicit invalid prefix never falls back to Hello', serial, () => {
  for (const prefix of [undefined, null, 0, NaN, Infinity, true, false, Symbol('prefix'), 1n,
    {}, [], () => 'Hi', new String('Hi'), '', ' ', '\t\r\n', '\u00a0\u2003\ufeff\u2028\u2029']) {
    assert.throws(() => greeting('Ada', { prefix }), TypeError);
    assert.throws(() => greeting('Ada', Object.assign(Object.create(null), { prefix })), TypeError);
  }
  let reads = 0;
  const coercible = new Proxy({}, { get() { reads += 1; throw new Error('must not coerce'); } });
  assert.throws(() => greeting('Ada', { prefix: coercible }), TypeError);
  assert.equal(reads, 0);
});

test('T05 AC-PREFIX/AC-OPTIONS: own non-enumerable prefix and shadowed hasOwnProperty', serial, () => {
  const options = Object.defineProperties({}, {
    prefix: { value: ' Hey ', enumerable: false },
    hasOwnProperty: { get() { throw new Error('must use intrinsic own check'); } },
    unrelated: { get() { throw new Error('must not read unrelated values'); } },
  });
  assert.equal(greeting('Ada', options), 'Hey, Ada!');
  const noPrefix = Object.defineProperty({}, 'unrelated', {
    get() { throw new Error('must not read unrelated values'); },
  });
  assert.equal(greeting('Ada', noPrefix), 'Hello, Ada!');
});

test('T06 AC-PREFIX: ignores inherited prefix on an otherwise valid plain object', serial, () => {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'prefix');
  let reads = 0;
  let result;
  try {
    Object.defineProperty(Object.prototype, 'prefix', {
      configurable: true, get() { reads += 1; throw new Error('inherited getter must not run'); },
    });
    result = greeting('Ada', {});
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'prefix', previous);
    else delete Object.prototype.prefix;
  }
  assert.equal(result, 'Hello, Ada!');
  assert.equal(reads, 0);
});

test('T07 AC-OPTIONS: own getter read once for success and invalid return', serial, () => {
  for (const value of [' Hi ', undefined, null, 42, new String('Hi'), ' \t ']) {
    let reads = 0;
    const options = Object.defineProperty({}, 'prefix', {
      get() { reads += 1; return value; },
    });
    if (typeof value === 'string' && value === ' Hi ') {
      assert.equal(greeting('Ada', options), 'Hi, Ada!');
    } else {
      assert.throws(() => greeting('Ada', options), TypeError);
    }
    assert.equal(reads, 1);
  }
});

test('T08 AC-OPTIONS: getter exception identity including primitive throws', serial, () => {
  for (const sentinel of [new Error('sentinel'), {}, undefined, null, 'sentinel', 7, Symbol('sentinel')]) {
    let reads = 0;
    const options = Object.defineProperty({}, 'prefix', {
      get() { reads += 1; throw sentinel; },
    });
    thrownValue(() => greeting('Ada', options), sentinel);
    assert.equal(reads, 1);
  }
});

test('T09 AC-COMPAT/AC-OPTIONS: invalid name never touches options or name hooks', serial, () => {
  const accesses = [];
  const nameObject = Object.defineProperties({}, Object.fromEntries(
    ['trim', 'toString', 'valueOf', Symbol.toPrimitive].map(key => [key, {
      get() { accesses.push(key); throw new Error('name property must not be read'); },
    }]),
  ));
  for (const name of [undefined, null, 0, false, Symbol('name'), 1n, [], () => {},
    nameObject, new String('Ada'), '', ' ', '\t\r\n', '\u00a0\u2003\ufeff']) {
    const { options, events } = observedOptions();
    assert.throws(() => greeting(name, options), TypeError);
    assert.deepEqual(events, []);
  }
  assert.deepEqual(accesses, []);
});

test('T10 AC-OPTIONS: complete name trim precedes all options observations', serial, () => {
  const { options, events } = observedOptions({ prefix: ' Hi ' });
  const original = Object.getOwnPropertyDescriptor(String.prototype, 'trim');
  let result;
  try {
    Object.defineProperty(String.prototype, 'trim', {
      ...original,
      value: function () {
        events.push(['trim', this]);
        return Reflect.apply(original.value, this, []);
      },
    });
    result = greeting(' Ada ', options);
  } finally {
    Object.defineProperty(String.prototype, 'trim', original);
  }
  assert.equal(result, 'Hi, Ada!');
  assert.deepEqual(events, [
    ['trim', ' Ada '], 'prototype', ['own', 'prefix'], ['get', 'prefix'], ['trim', ' Hi '],
  ]);
  const empty = observedOptions({});
  assert.equal(greeting('Ada', empty.options), 'Hello, Ada!');
  assert.deepEqual(empty.events, ['prototype', ['own', 'prefix']]);
});

test('T11 AC-OPTIONS: observation exceptions propagate without retry', serial, () => {
  for (const trap of ['getPrototypeOf', 'getOwnPropertyDescriptor', 'get']) {
    const sentinel = new Error(trap);
    let calls = 0;
    const options = new Proxy({ prefix: 'Hi' }, {
      [trap]() { calls += 1; throw sentinel; },
    });
    thrownValue(() => greeting('Ada', options), sentinel);
    assert.equal(calls, 1);
  }
});

test('T12 AC-COMPAT/AC-OPTIONS: frozen/sealed inputs retain descriptors, keys and prototype', serial, () => {
  const inputs = [Object.freeze({}), Object.seal({}), Object.freeze({ prefix: ' Hi ' }),
    Object.seal({ prefix: ' Hi ', unrelated: 1 }),
    Object.freeze(Object.assign(Object.create(null), { prefix: ' Hi ' }))];
  for (const options of inputs) {
    const keys = Reflect.ownKeys(options);
    const descriptors = Object.getOwnPropertyDescriptors(options);
    const prototype = Object.getPrototypeOf(options);
    const expected = Object.hasOwn(options, 'prefix') ? 'Hi, Ada!' : 'Hello, Ada!';
    assert.equal(greeting('Ada', options), expected);
    assert.deepEqual(Reflect.ownKeys(options), keys);
    assert.deepEqual(Object.getOwnPropertyDescriptors(options), descriptors);
    assert.strictEqual(Object.getPrototypeOf(options), prototype);
  }
  const writes = [];
  const target = { prefix: ' Hi ' };
  const descriptors = Object.getOwnPropertyDescriptors(target);
  const options = new Proxy(target, {
    set() { writes.push('set'); return false; },
    defineProperty() { writes.push('define'); return false; },
    deleteProperty() { writes.push('delete'); return false; },
    setPrototypeOf() { writes.push('prototype'); return false; },
  });
  assert.equal(greeting('Ada', options), 'Hi, Ada!');
  assert.deepEqual(writes, []);
  assert.deepEqual(Object.getOwnPropertyDescriptors(target), descriptors);
});

test('T13 AC-PREFIX/AC-OPTIONS: repeated and reentrant calls have independent local state', serial, () => {
  let reads = 0;
  const options = { get prefix() { reads += 1; return reads === 1 ? ' Hi ' : ' Bye '; } };
  assert.equal(greeting('Ada', options), 'Hi, Ada!');
  assert.throws(() => greeting('Ada', { prefix: '' }), TypeError);
  assert.equal(greeting('Ada'), 'Hello, Ada!');
  assert.equal(greeting('Ada', options), 'Bye, Ada!');
  assert.equal(reads, 2);
  let inner;
  let outerReads = 0;
  assert.equal(greeting('Ada', { get prefix() {
    outerReads += 1;
    inner = greeting(' Grace ', { prefix: ' Welcome ' });
    return ' Hey ';
  } }), 'Hey, Ada!');
  assert.equal(inner, 'Welcome, Grace!');
  assert.equal(outerReads, 1);
});
