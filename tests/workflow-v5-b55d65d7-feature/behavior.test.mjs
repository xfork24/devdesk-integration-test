import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-b55d65d7/greeting.mjs';

// Public ESM entry only. Loading errors remain runner errors, not business Red.
test('FEATURE-GREET: synchronous exact results preserve caller content', () => {
  const examples = [
    ['Ada', 'Hello, Ada!'],
    [' \tAda\r\n', 'Hello, Ada!'],
    ['Ada Lovelace', 'Hello, Ada Lovelace!'],
    ['  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
    ['\tGrace\t\nHopper\n', 'Hello, Grace\t\nHopper!'],
    ['  aDa, 世界! e\u0301 😀  ', 'Hello, aDa, 世界! e\u0301 😀!'],
    ['\u200b', 'Hello, \u200b!'],
    ['\u0085', 'Hello, \u0085!'],
  ];
  for (const [input, expected] of examples) {
    assert.equal(greeting(input), expected);
  }
});

test('FEATURE-TRIM: standard whitespace is removed at either edge and rejected alone', () => {
  // Explicit ECMAScript WhiteSpace and LineTerminator fixtures, not implementation-derived.
  const whitespace = [
    '\u0009', '\u000a', '\u000b', '\u000c', '\u000d', '\u0020',
    '\u00a0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003',
    '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
    '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\ufeff',
  ];
  assert.throws(() => greeting(''), TypeError);
  for (const edge of whitespace) {
    assert.equal(greeting(`${edge}Ada`), 'Hello, Ada!');
    assert.equal(greeting(`Ada${edge}`), 'Hello, Ada!');
    assert.equal(greeting(` ${edge}Ada${edge}\t`), 'Hello, Ada!');
    assert.equal(greeting(`Ada${edge}Lovelace`), `Hello, Ada${edge}Lovelace!`);
    assert.throws(() => greeting(edge), TypeError);
  }
  assert.throws(() => greeting(whitespace.join('')), TypeError);
});

test('FEATURE-INVALID: all non-string categories synchronously throw TypeError', () => {
  const inputs = [
    undefined, null, 0, -1, NaN, Infinity, true, false,
    {}, [], ['Ada'], () => 'Ada', Symbol('Ada'), 0n, 1n,
    new String('Ada'), new String(''), { trim: () => 'Ada' },
  ];
  for (const input of inputs) {
    assert.throws(() => greeting(input), TypeError);
  }
  assert.throws(() => greeting(), TypeError);
});

test('FEATURE-NO-COERCION: rejection does not access or mutate the input', () => {
  const accesses = [];
  const target = Object.freeze({ label: 'Ada' });
  const input = new Proxy(target, {
    get(object, key) {
      accesses.push(key);
      return Reflect.get(object, key);
    },
    set(object, key) {
      accesses.push(key);
      return false;
    },
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.throws(() => greeting(input), TypeError);
  }
  assert.deepEqual(accesses, []);
  assert.deepEqual(target, { label: 'Ada' });
});

test('FEATURE-RECOVERY: invalid calls leave subsequent greetings and repeat calls unchanged', () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(greeting('  Ada  '), 'Hello, Ada!');
    for (const invalid of ['', ' \t\n ', null, new String('Ada')]) {
      assert.throws(() => greeting(invalid), TypeError);
      assert.equal(greeting(' Grace  Hopper '), 'Hello, Grace  Hopper!');
      assert.equal(greeting('  Ada  '), 'Hello, Ada!');
    }
  }
});
