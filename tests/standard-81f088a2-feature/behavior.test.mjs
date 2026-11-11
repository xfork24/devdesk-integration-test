import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../../src/standard-81f088a2/add.mjs';
import { twice } from '../../src/standard-81f088a2/twice.mjs';

// Independent Feature assertions: no Task test files or development fixtures.
test('FEATURE-01 / AC-01, AC-03, AC-08: both exports return synchronous arithmetic results', () => {
  for (const [a, b, expected] of [
    [2, 3, 5], [-2, 3, 1], [-2, -3, -5], [0, 0, 0], [0.5, 0.25, 0.75],
  ]) {
    assert.strictEqual(add(a, b), expected);
  }
  for (const [n, expected] of [[3, 6], [-3, -6], [0, 0], [0.5, 1]]) {
    assert.strictEqual(twice(n), expected);
  }
});

test('FEATURE-02 / AC-01, AC-03, AC-08: native float, signed zero and finite-input overflow', () => {
  assert.strictEqual(add(0.1, 0.2), 0.30000000000000004);
  assert.strictEqual(add(-0, -0), -0);
  assert.strictEqual(add(-0, 0), 0);
  assert.strictEqual(add(Number.MIN_VALUE, Number.MIN_VALUE), 1e-323);
  assert.strictEqual(add(Number.MAX_VALUE, -Number.MAX_VALUE), 0);
  assert.strictEqual(add(Number.MAX_VALUE, Number.MAX_VALUE), Infinity);
  assert.strictEqual(add(-Number.MAX_VALUE, -Number.MAX_VALUE), -Infinity);
  assert.strictEqual(twice(-0), -0);
  assert.strictEqual(twice(0.1), 0.2);
  assert.strictEqual(twice(Number.MIN_VALUE), 1e-323);
  assert.strictEqual(twice(-Number.MIN_VALUE), -1e-323);
  assert.strictEqual(twice(Number.MAX_VALUE), Infinity);
  assert.strictEqual(twice(-Number.MAX_VALUE), -Infinity);
});

const invalidInputs = [
  ['numeric string', '3'], ['empty string', ''],
  ['null', null], ['undefined', undefined], ['true', true], ['false', false],
  ['object', {}], ['empty array', []], ['numeric array', [3]],
  ['boxed number', new Number(3)], ['function', () => 3],
  ['bigint', 3n], ['symbol', Symbol('invalid')],
  ['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity],
];

for (const [label, value] of invalidInputs) {
  test(`FEATURE-03 / AC-02, AC-04, AC-08: synchronous TypeError for ${label}`, () => {
    assert.throws(() => add(value, 3), TypeError);
    assert.throws(() => add(3, value), TypeError);
    assert.throws(() => twice(value), TypeError);
  });
}

test('FEATURE-04 / AC-02, AC-04, AC-08: missing required arguments are rejected', () => {
  assert.throws(() => add(), TypeError);
  assert.throws(() => add(1), TypeError);
  assert.throws(() => twice(), TypeError);
});

test('FEATURE-05 / AC-02, AC-04, AC-08: neither module coerces or mutates rejected objects', () => {
  let conversions = 0;
  const value = Object.freeze({
    [Symbol.toPrimitive]() { conversions += 1; return 3; },
    valueOf() { conversions += 1; return 3; },
    toString() { conversions += 1; return '3'; },
  });
  assert.throws(() => add(value, 3), TypeError);
  assert.throws(() => add(3, value), TypeError);
  assert.throws(() => twice(value), TypeError);
  assert.strictEqual(conversions, 0);
});

test('FEATURE-06 / AC-01, AC-02, AC-03, AC-04, AC-08: interleaved failures and repeats preserve both modules', () => {
  for (const [, value] of invalidInputs) {
    assert.throws(() => add(value, 3), TypeError);
    assert.strictEqual(twice(3), 6);
    assert.strictEqual(add(2, 3), 5);
    assert.throws(() => twice(value), TypeError);
    assert.strictEqual(add(-2, 3), 1);
    assert.strictEqual(twice(-3), -6);
    assert.throws(() => add(3, value), TypeError);
    assert.strictEqual(twice(0.5), 1);
    assert.strictEqual(add(0.5, 0.25), 0.75);
  }
  for (let i = 0; i < 3; i += 1) {
    assert.strictEqual(add(2, 3), 5);
    assert.strictEqual(twice(3), 6);
  }
});
