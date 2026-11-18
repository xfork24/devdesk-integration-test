import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../src/workflow-v5-b55d65d7/greeting.mjs';
const snap = o => [Reflect.ownKeys(o), Object.getPrototypeOf(o), Object.getOwnPropertyDescriptors(o)];
test('increment 1: valid prefixes, defaults, own properties and read-only inputs', () => {
  assert.equal(greeting(' Ada ', {prefix: ' Hi '}), 'Hi, Ada!');
  assert.equal(greeting.length, 1);
  for (const o of [undefined, {}, Object.create(null)]) assert.equal(greeting(' Ada ', o), 'Hello, Ada!');
  for (const prefix of ['\u00a0Hi\ufeff', ' Good\t day ', '\u200b', '你好']) {
    assert.equal(greeting(' Ada  Lovelace ', {prefix}), `${prefix.trim()}, Ada  Lovelace!`);
  }
  for (const proto of [Object.prototype, null]) for (const seal of [o => o, Object.seal, Object.freeze]) {
    let reads = 0;
    const o = Object.create(proto, {
      prefix: {get() { assert.equal(this, o); reads++; return ' Hey '; }},
      hasOwnProperty: {get() { throw Error('unused'); }},
      extra: {enumerable: true, get() { throw Error('unused'); }}
    });
    seal(o); const before = snap(o);
    assert.equal(greeting('Ada', o), 'Hey, Ada!');
    assert.equal(reads, 1); assert.deepEqual(snap(o), before);
  }
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'prefix');
  try {
    Object.defineProperty(Object.prototype, 'prefix', {configurable: true, get() { throw Error('inherited'); }});
    assert.equal(greeting('Ada', {}), 'Hello, Ada!');
    assert.equal(greeting('Ada', Object.defineProperty({}, 'prefix', {value: 'Own'})), 'Own, Ada!');
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'prefix', previous);
    else delete Object.prototype.prefix;
  }
});
test('increment 2: strict rejection, access order, exceptions and recovery', () => {
  class Options {}
  for (const options of [null, [], '', 'Hi', 0, NaN, false, true, Symbol(), 1n, () => {}, new String('Hi'), new Options(), Object.create({})]) {
    assert.throws(() => greeting('Ada', options), TypeError);
  }
  const poison = Object.defineProperty({}, 'trim', {get() { throw Error('must not read trim'); }});
  for (const proto of [Object.prototype, null]) for (const prefix of [undefined, null, 0, NaN, false, true, Symbol(), 1n, {}, [], () => {}, new String('Hi'), poison, '', ' \t\ufeff']) {
    const o = Object.create(proto, {prefix: {value: prefix}}); const before = snap(o);
    assert.throws(() => greeting('Ada', o), TypeError); assert.deepEqual(snap(o), before);
  }
  const events = [];
  const proxy = new Proxy({prefix: 'Hi'}, {
    getPrototypeOf(t) { events.push('prototype'); return Reflect.getPrototypeOf(t); },
    getOwnPropertyDescriptor(t, k) { events.push('own'); return Reflect.getOwnPropertyDescriptor(t, k); },
    get(t, k, r) { events.push('get'); return Reflect.get(t, k, r); }
  });
  assert.equal(greeting('Ada', proxy), 'Hi, Ada!');
  assert.deepEqual(events, ['prototype', 'own', 'get']); events.length = 0;
  for (const name of [undefined, null, {}, new String('Ada'), '', ' \t']) assert.throws(() => greeting(name, proxy), TypeError);
  assert.deepEqual(events, []);
  const sentinel = Error('sentinel');
  for (const trap of ['getPrototypeOf', 'getOwnPropertyDescriptor', 'get']) {
    let calls = 0;
    assert.throws(() => greeting('Ada', new Proxy({prefix: 'Hi'}, {[trap]() { calls++; throw sentinel; }})), e => e === sentinel);
    assert.equal(calls, 1);
  }
  for (const value of [undefined, '', 1, ' Hi ']) {
    let reads = 0;
    const o = Object.defineProperty({}, 'prefix', {get() { reads++; return reads === 1 ? value : 'Wrong'; }});
    const before = snap(o);
    if (value === ' Hi ') assert.equal(greeting('Ada', o), 'Hi, Ada!');
    else assert.throws(() => greeting('Ada', o), TypeError);
    assert.equal(reads, 1); assert.deepEqual(snap(o), before);
  }
  let reads = 0;
  const o = Object.freeze(Object.defineProperty({}, 'prefix', {get() { reads++; throw sentinel; }}));
  const before = snap(o);
  assert.throws(() => greeting('Ada', o), e => e === sentinel);
  assert.equal(reads, 1); assert.deepEqual(snap(o), before);
  const nested = {get prefix() { assert.equal(greeting('Inner', {prefix: 'Nested'}), 'Nested, Inner!'); return 'Outer'; }};
  assert.equal(greeting('Ada', nested), 'Outer, Ada!');
  assert.equal(greeting('Ada'), 'Hello, Ada!');
});
