import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-177d0c8c/greeting.mjs';

// Single-Task Feature: exercise the public synchronous interface end to end.
// Static import failures remain loading failures, never business assertion Red.
test('AC-GREET: caller receives exact strings for the complete valid-input flow', () => {
  const cases = [
    ['Ada', 'Hello, Ada!'],
    ['  Ada  ', 'Hello, Ada!'],
    ['\tAda\n', 'Hello, Ada!'],
    [' Ada Lovelace ', 'Hello, Ada Lovelace!'],
    ['\r\n 李  aDa\t👋 e\u0301 \u00a0', 'Hello, 李  aDa\t👋 e\u0301!'],
    [' \u200b ', 'Hello, \u200b!'],
  ];
  for (const [input, expected] of cases) {
    const result = greeting(input);
    assert.strictEqual(typeof result, 'string');
    assert.strictEqual(result, expected);
  }
});

test('AC-GREET/AC-INVALID: standard trim boundaries, empty rejection, and recovery', () => {
  const whitespace = [
    '\u0009', '\u000a', '\u000b', '\u000c', '\u000d', '\u0020',
    '\u00a0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003',
    '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
    '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\ufeff',
  ];
  for (const boundary of whitespace) {
    assert.throws(() => greeting(boundary), TypeError);
    assert.strictEqual(greeting(`${boundary}Grace${boundary}`), 'Hello, Grace!');
    assert.strictEqual(greeting(`A${boundary}B`), `Hello, A${boundary}B!`);
  }
  assert.throws(() => greeting(''), TypeError);
  assert.throws(() => greeting(whitespace.join('')), TypeError);
  assert.strictEqual(greeting(' Ada '), 'Hello, Ada!');
});

test('AC-INVALID: each rejected input permits a corrected call and repeat call', () => {
  const invalidInputs = [
    '', ' \t\r\n ', undefined, null, 0, -1, NaN, Infinity, true, false,
    {}, [], ['Ada'], () => 'Ada', Symbol('Ada'), 0n, new String('Ada'),
  ];
  for (const input of invalidInputs) {
    assert.throws(() => greeting(input), TypeError);
    assert.strictEqual(greeting(' Grace Hopper '), 'Hello, Grace Hopper!');
    assert.strictEqual(greeting(' Ada '), 'Hello, Ada!');
  }
  assert.throws(() => greeting(), TypeError);
  assert.strictEqual(greeting(' Grace Hopper '), 'Hello, Grace Hopper!');
});

test('AC-INVALID: caller-owned objects are rejected without access or mutation', () => {
  const operations = [];
  const input = new Proxy(Object.freeze({ name: 'Ada' }), {
    get(_target, key) {
      operations.push(['get', key]);
      throw new Error('input properties must not be read');
    },
    set(_target, key) {
      operations.push(['set', key]);
      throw new Error('input properties must not be changed');
    },
  });
  assert.throws(() => greeting(input), TypeError);
  assert.deepStrictEqual(operations, []);
  assert.strictEqual(greeting(' Ada '), 'Hello, Ada!');
});

test('AC-GREET/AC-INVALID: interleaved callers retain independent results', () => {
  const first = greeting(' Ada  Lovelace ');
  const second = greeting('\tGrace Hopper\n');
  assert.throws(() => greeting(null), TypeError);
  assert.strictEqual(first, 'Hello, Ada  Lovelace!');
  assert.strictEqual(second, 'Hello, Grace Hopper!');
  assert.strictEqual(greeting(' Ada  Lovelace '), first);
  assert.strictEqual(greeting('\tGrace Hopper\n'), second);
});
