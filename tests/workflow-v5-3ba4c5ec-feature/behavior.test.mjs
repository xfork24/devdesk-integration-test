import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { greeting } from '../../src/workflow-v5-b55d65d7/greeting.mjs';

// Feature calls use the public entry with real objects, no product stubs.
// All fixtures are local except F04's synchronous, finally-restored prototype probe.
const serial = { concurrency: false };

test('F01 AC-COMPAT/AC-PREFIX: complete default/custom/default caller flow', serial, () => {
  assert.equal(greeting(' Ada '), 'Hello, Ada!');
  for (const options of [undefined, {}, Object.create(null), { ignored: 'Bye' }]) {
    assert.equal(greeting(' Ada ', options), 'Hello, Ada!');
  }
  assert.equal(greeting(' Ada ', { prefix: ' Hi ' }), 'Hi, Ada!');
  assert.equal(greeting('\u00a0\ufeffGrace\t\nHopper\u2029', {
    prefix: '\u2003 Good  day \ufeff',
  }), 'Good  day, Grace\t\nHopper!');
  assert.equal(greeting('\u200b', { prefix: '\u200b' }), '\u200b, \u200b!');
  assert.equal(greeting(' Ada '), 'Hello, Ada!');
});

test('F02 AC-OPTIONS: invalid options cannot execute prefix and do not poison later calls', serial, () => {
  let reads = 0;
  const custom = Object.create({});
  Object.defineProperty(custom, 'prefix', { get() { reads++; return 'Hi'; } });
  class Options { get prefix() { reads++; return 'Hi'; } }
  // Strict comparison is against the current realm Object.prototype.
  const foreign = runInNewContext('({ prefix: "Hi" })');
  for (const options of [null, [], () => {}, '', 0, true, Symbol('options'), 1n,
    new String('Hi'), custom, new Options(), foreign]) {
    assert.throws(() => greeting('Ada', options), TypeError);
    assert.equal(greeting(' Grace ', { prefix: ' Welcome ' }), 'Welcome, Grace!');
  }
  assert.equal(reads, 0);
});

test('F03 AC-OPTIONS/AC-PREFIX: reject, repair and reuse the same options', serial, () => {
  const options = Object.create(null);
  for (const prefix of [undefined, null, 42, false, Symbol('prefix'), 1n,
    {}, [], () => 'Hi', new String('Hi'), '', '\u00a0\u2003\ufeff\r\n']) {
    options.prefix = prefix;
    const before = Object.getOwnPropertyDescriptors(options);
    assert.throws(() => greeting('Ada', options), TypeError);
    assert.deepEqual(Object.getOwnPropertyDescriptors(options), before);
    options.prefix = ' Hey ';
    assert.equal(greeting('Ada', options), 'Hey, Ada!');
    delete options.prefix;
    assert.equal(greeting('Ada', options), 'Hello, Ada!');
  }
});

test('F04 AC-PREFIX/AC-OPTIONS: inherited getter ignored; own non-enumerable getter wins', serial, () => {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'prefix');
  let inheritedReads = 0;
  let ownReads = 0;
  const own = Object.defineProperties({}, {
    prefix: { get() { ownReads++; return ' Salut '; }, enumerable: false },
    unrelated: { get() { throw new Error('unrelated field read'); } },
    hasOwnProperty: { get() { throw new Error('shadowed method read'); } },
  });
  let defaults;
  let custom;
  try {
    Object.defineProperty(Object.prototype, 'prefix', {
      configurable: true,
      get() { inheritedReads++; throw new Error('inherited prefix read'); },
    });
    defaults = [greeting('Ada', {}), greeting('Ada', Object.create(null))];
    custom = greeting('Ada', own);
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'prefix', previous);
    else delete Object.prototype.prefix;
  }
  assert.deepEqual(defaults, ['Hello, Ada!', 'Hello, Ada!']);
  assert.equal(custom, 'Salut, Ada!');
  assert.equal(inheritedReads, 0);
  assert.equal(ownReads, 1);
});

test('F05 AC-COMPAT/AC-OPTIONS: name rejection precedes all options observations', serial, () => {
  const observations = [];
  const options = new Proxy({ prefix: 'Hi' }, {
    getPrototypeOf(target) { observations.push('prototype'); return Reflect.getPrototypeOf(target); },
    getOwnPropertyDescriptor(target, key) {
      observations.push('own'); return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) { observations.push('get'); return Reflect.get(target, key, receiver); },
  });
  const hooks = [];
  const name = Object.defineProperties({}, Object.fromEntries(
    ['trim', 'toString', 'valueOf', Symbol.toPrimitive].map(key => [key, {
      get() { hooks.push(key); throw new Error('name hook read'); },
    }]),
  ));
  for (const invalid of [name, new String('Ada'), null, undefined, 7, false,
    Symbol('name'), 1n, [], () => {}, '', '\u00a0\ufeff\u2029']) {
    assert.throws(() => greeting(invalid, options), TypeError);
    assert.deepEqual(observations, []);
    assert.deepEqual(hooks, []);
  }
  assert.equal(greeting(' Ada ', options), 'Hi, Ada!');
  assert.equal(observations.filter(event => event === 'get').length, 1);
});

test('F06 AC-OPTIONS/AC-PREFIX: one getter read per call across failure and recovery', serial, () => {
  const sentinel = new Error('caller failure');
  const values = [' Hi ', undefined, sentinel, ' Bye '];
  let reads = 0;
  const options = Object.freeze(Object.defineProperty(Object.create(null), 'prefix', {
    get() {
      const value = values[reads++];
      if (value === sentinel) throw sentinel;
      return value;
    },
  }));
  const before = Object.getOwnPropertyDescriptors(options);
  assert.equal(greeting('Ada', options), 'Hi, Ada!');
  assert.equal(reads, 1);
  assert.throws(() => greeting('Ada', options), TypeError);
  assert.equal(reads, 2);
  assert.throws(() => greeting('Ada', options), error => error === sentinel);
  assert.equal(reads, 3);
  assert.equal(greeting('Ada', options), 'Bye, Ada!');
  assert.equal(reads, 4);
  assert.deepEqual(Object.getOwnPropertyDescriptors(options), before);
  assert.equal(Object.getPrototypeOf(options), null);
  assert.equal(greeting('Ada'), 'Hello, Ada!');
});

test('F07 AC-COMPAT/AC-PREFIX/AC-OPTIONS: frozen and sealed fixtures stay unchanged', serial, () => {
  const fixtures = [
    [Object.freeze({}), 'Hello, Ada!'],
    [Object.seal(Object.create(null)), 'Hello, Ada!'],
    [Object.freeze({ prefix: ' Hi ' }), 'Hi, Ada!'],
    [Object.seal({ prefix: ' Welcome ', extra: 1 }), 'Welcome, Ada!'],
    [Object.freeze(Object.assign(Object.create(null), { prefix: ' Hey ' })), 'Hey, Ada!'],
  ];
  for (const [options, expected] of fixtures) {
    const before = Object.getOwnPropertyDescriptors(options);
    const keys = Reflect.ownKeys(options);
    const prototype = Object.getPrototypeOf(options);
    for (let i = 0; i < 3; i++) assert.equal(greeting(' Ada ', options), expected);
    assert.deepEqual(Object.getOwnPropertyDescriptors(options), before);
    assert.deepEqual(Reflect.ownKeys(options), keys);
    assert.equal(Object.getPrototypeOf(options), prototype);
  }
});

test('F08 AC-PREFIX/AC-OPTIONS: reentrant failure and success cannot replace outer state', serial, () => {
  let reads = 0;
  const options = { get prefix() {
    reads++;
    assert.throws(() => greeting('Inner', { prefix: '' }), TypeError);
    assert.equal(greeting(' Grace ', { prefix: ' Welcome ' }), 'Welcome, Grace!');
    assert.equal(greeting('Inner'), 'Hello, Inner!');
    return ' Hey ';
  } };
  for (let i = 1; i <= 2; i++) {
    assert.equal(greeting(' Ada ', options), 'Hey, Ada!');
    assert.equal(reads, i);
    assert.equal(greeting('Ada'), 'Hello, Ada!');
  }
});
