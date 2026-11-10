import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-99f2a5ce/greeting.mjs';

// Independent Feature regression; no Task test imports or shared fixtures.
// Run with the Task suite; timeout_seconds=60. Loading errors remain loading
// errors, and this closure suite does not manufacture a new TDD Red.
test('AC-GREET: ESM entry returns exact synchronous greetings', () => {
  assert.equal(typeof greeting, 'function');
  const cases = [
    ['Ada', 'Hello, Ada!'],
    ['  Ada  ', 'Hello, Ada!'],
    ['\tAda\n', 'Hello, Ada!'],
    [' Ada Lovelace ', 'Hello, Ada Lovelace!'],
    [' Grace  Hopper ', 'Hello, Grace  Hopper!'],
    [' A\tB\nC ', 'Hello, A\tB\nC!'],
    [' aDa ', 'Hello, aDa!'],
    [' 李雷 👋 ', 'Hello, 李雷 👋!'],
    [' e\u0301 ', 'Hello, e\u0301!'],
    [' <Ada>&! ', 'Hello, <Ada>&!!'],
    ['\u200b', 'Hello, \u200b!'],
    ['\u0085', 'Hello, \u0085!'],
  ];
  for (const [input, expected] of cases) {
    const actual = greeting(input);
    assert.equal(typeof actual, 'string', 'must return a primitive string synchronously');
    assert.equal(actual, expected, JSON.stringify(input));
  }
});

test('AC-GREET / AC-INVALID: JavaScript trim boundaries', () => {
  // Explicit ECMAScript WhiteSpace and LineTerminator characters, not a
  // second trim implementation used to calculate expected results.
  const whitespace = [
    '\u0009', '\u000a', '\u000b', '\u000c', '\u000d', '\u0020',
    '\u00a0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003',
    '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
    '\u200a', '\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\ufeff',
  ];
  for (const boundary of whitespace) {
    assert.equal(greeting(`${boundary}Ada${boundary}`), 'Hello, Ada!');
    assert.throws(() => greeting(boundary), TypeError);
  }
  for (const blank of ['', '   ', '\t\n', ' \r\n\t ', '\u00a0\ufeff\u3000']) {
    assert.throws(() => greeting(blank), TypeError);
  }
});

test('AC-INVALID: omitted argument and non-string values throw synchronously', () => {
  assert.throws(() => greeting(), TypeError);
  const invalid = [
    undefined, null, 0, -1, NaN, Infinity, true, false, {}, [], ['Ada'],
    new String('Ada'), new String(''), () => 'Ada', Symbol('Ada'), 1n,
    Object.create(null),
  ];
  for (const input of invalid) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('AC-INVALID: rejection never reads or coerces caller objects', () => {
  let reads = 0;
  const input = new Proxy(Object.freeze({}), {
    get() {
      reads += 1;
      throw new Error('caller property was accessed');
    },
  });
  assert.throws(() => greeting(input), TypeError);
  assert.equal(reads, 0);

  let conversions = 0;
  const convertible = Object.freeze({
    trim() { conversions += 1; return 'Ada'; },
    toString() { conversions += 1; return 'Ada'; },
    valueOf() { conversions += 1; return 'Ada'; },
    [Symbol.toPrimitive]() { conversions += 1; return 'Ada'; },
  });
  assert.throws(() => greeting(convertible), TypeError);
  assert.equal(conversions, 0);
});

test('AC-GREET / AC-INVALID: caller recovers and repeated calls remain independent', () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.throws(() => greeting(null), TypeError);
    assert.equal(greeting(' Grace Hopper '), 'Hello, Grace Hopper!');
    assert.throws(() => greeting(' \t\n'), TypeError);
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
  }
});
