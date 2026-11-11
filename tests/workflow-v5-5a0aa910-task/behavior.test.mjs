import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-5a0aa910/greeting.mjs';

// Task-only recipe: node --test tests/workflow-v5-5a0aa910-task/behavior.test.mjs
// Static import intentionally preserves missing-module/export errors as prerequisites.
// No fixtures, external services, shared state, or cleanup are required.

test('AC-GREET: returns the exact synchronous greeting for primitive strings', () => {
  const cases = [
    ['Alice', 'Hello, Alice!'],
    ['aLiCe', 'Hello, aLiCe!'],
    ['A', 'Hello, A!'],
    ['0', 'Hello, 0!'],
    ['世界 👋', 'Hello, 世界 👋!'],
    ['e\u0301', 'Hello, e\u0301!'],
    ['Alice!', 'Hello, Alice!!'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(greeting(input), expected, JSON.stringify(input));
  }
});

test('AC-GREET: trims native JavaScript boundary whitespace', () => {
  const whitespace = [
    '\u0009', '\u000A', '\u000B', '\u000C', '\u000D', '\u0020',
    '\u00A0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003',
    '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
    '\u200A', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF',
  ];
  for (const boundary of whitespace) {
    assert.equal(greeting(`${boundary}Alice${boundary}`), 'Hello, Alice!');
  }
  assert.equal(greeting(' \t\r\n Alice \n\t '), 'Hello, Alice!');
});

test('AC-GREET: preserves internal characters and non-trimmable boundaries', () => {
  const cases = [
    ['  A B  ', 'Hello, A B!'],
    ['  A  B  ', 'Hello, A  B!'],
    ['\tA\tB\n', 'Hello, A\tB!'],
    [' A\nB ', 'Hello, A\nB!'],
    [' A\r\nB ', 'Hello, A\r\nB!'],
    [' A\u00A0B ', 'Hello, A\u00A0B!'],
    ['\u200BAlice\u200B', 'Hello, \u200BAlice\u200B!'],
    ['\u200B', 'Hello, \u200B!'],
    ['\u0000', 'Hello, \u0000!'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(greeting(input), expected, JSON.stringify(input));
  }
});

test('AC-INVALID: empty and whitespace-only strings synchronously throw TypeError', () => {
  for (const input of ['', ' ', '\t\r\n', '\u00A0', '\uFEFF', '\u1680\u2003\u2028\u2029\u202F\u205F\u3000']) {
    assert.throws(() => greeting(input), TypeError, JSON.stringify(input));
  }
});

test('AC-INVALID: missing arguments and every non-string type throw TypeError', () => {
  assert.throws(() => greeting(), TypeError);
  const invalid = [
    undefined, null, 0, -1, NaN, Infinity, true, false,
    {}, [], ['Alice'], Symbol('Alice'), 1n, new String('Alice'),
    () => 'Alice',
  ];
  for (const input of invalid) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('AC-INVALID: rejects objects without conversion or trim hooks', () => {
  const calls = [];
  const input = {
    [Symbol.toPrimitive]() { calls.push('toPrimitive'); return 'Alice'; },
    toString() { calls.push('toString'); return 'Alice'; },
    valueOf() { calls.push('valueOf'); return 'Alice'; },
    get trim() { calls.push('trim'); return () => 'Alice'; },
  };
  assert.throws(() => greeting(input), TypeError);
  assert.deepEqual(calls, []);
});

test('AC-GREET / AC-INVALID: calls remain deterministic and recover after failures', () => {
  const input = '  Alice  ';
  for (let iteration = 0; iteration < 3; iteration += 1) {
    assert.equal(greeting(input), 'Hello, Alice!');
    assert.equal(greeting('Bob'), 'Hello, Bob!');
    assert.throws(() => greeting(' \t\n'), TypeError);
    assert.throws(() => greeting(null), TypeError);
    assert.equal(greeting(input), 'Hello, Alice!');
  }
  assert.equal(input, '  Alice  ');
});
