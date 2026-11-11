import test from 'node:test';
import assert from 'node:assert/strict';
import { twice } from '../../src/standard-81f088a2/twice.mjs';

test('TW-01 / AC-03: returns synchronous numeric results for normal inputs', () => {
  for (const [input, expected] of [[3, 6], [-3, -6], [0, 0], [0.5, 1]]) {
    assert.strictEqual(twice(input), expected, `twice(${input})`);
  }
});

test('TW-02 / AC-03: preserves native floating point, signed zero and overflow', () => {
  const cases = [
    [-0, -0],
    [0.1, 0.2],
    [-0.25, -0.5],
    [Number.MIN_VALUE, Number.MIN_VALUE * 2],
    [-Number.MIN_VALUE, -Number.MIN_VALUE * 2],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER * 2],
    [Number.MAX_VALUE, Infinity],
    [-Number.MAX_VALUE, -Infinity],
  ];
  for (const [input, expected] of cases) {
    assert.strictEqual(twice(input), expected, `native result for ${input}`);
  }
});

test('TW-03 / AC-04: rejects non-number and non-finite inputs synchronously', () => {
  const invalid = [
    ['numeric string', '3'], ['empty string', ''],
    ['null', null], ['undefined', undefined],
    ['true', true], ['false', false],
    ['object', {}], ['empty array', []], ['numeric array', [3]],
    ['boxed number', new Number(3)], ['function', () => 3],
    ['bigint', 3n], ['symbol', Symbol('3')],
    ['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity],
  ];
  for (const [label, input] of invalid) {
    assert.throws(() => twice(input), TypeError, label);
  }
});

test('TW-04 / AC-04: rejects an omitted required argument', () => {
  assert.throws(() => twice(), TypeError);
});

test('TW-05 / AC-04: rejects objects without coercion or mutation', () => {
  let coercions = 0;
  const input = Object.freeze({
    [Symbol.toPrimitive]() { coercions += 1; return 3; },
    valueOf() { coercions += 1; return 3; },
    toString() { coercions += 1; return '3'; },
  });
  assert.throws(() => twice(input), TypeError);
  assert.strictEqual(coercions, 0);
});

test('TW-06 / AC-03, AC-04: failures and repeated calls leave subsequent results intact', () => {
  for (const invalid of ['3', null, undefined, {}, [], 3n, Symbol('x'), NaN, Infinity, -Infinity]) {
    assert.strictEqual(twice(3), 6);
    assert.throws(() => twice(invalid), TypeError);
    assert.strictEqual(twice(-3), -6);
    assert.strictEqual(twice(0.5), 1);
  }
  assert.strictEqual(twice(3), 6);
  assert.strictEqual(twice(3), 6);
});
