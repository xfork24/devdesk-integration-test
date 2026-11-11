import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../../src/standard-81f088a2/add.mjs';

test('ADD-01: normal finite number addition returns a synchronous number', () => {
  for (const [a, b, expected] of [
    [2, 3, 5],
    [-2, 3, 1],
    [-2, -3, -5],
    [0, 0, 0],
    [0.5, 0.25, 0.75],
  ]) {
    assert.strictEqual(add(a, b), expected);
  }
});

test('ADD-02: preserve native floating point, signed zero and overflow semantics', () => {
  for (const [a, b, expected] of [
    [0.1, 0.2, 0.30000000000000004],
    [-0, -0, -0],
    [-0, 0, 0],
    [Number.MIN_VALUE, Number.MIN_VALUE, 1e-323],
    [Number.MAX_VALUE, -Number.MAX_VALUE, 0],
    [Number.MAX_VALUE, Number.MAX_VALUE, Infinity],
    [-Number.MAX_VALUE, -Number.MAX_VALUE, -Infinity],
  ]) {
    assert.strictEqual(add(a, b), expected);
  }
});

const invalidInputs = [
  ['numeric string', '2'],
  ['empty string', ''],
  ['null', null],
  ['undefined', undefined],
  ['true', true],
  ['false', false],
  ['object', {}],
  ['empty array', []],
  ['numeric array', [2]],
  ['boxed number', new Number(2)],
  ['function', () => 2],
  ['bigint', 2n],
  ['symbol', Symbol('invalid')],
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['-Infinity', -Infinity],
];

for (const [label, value] of invalidInputs) {
  test(`ADD-03: reject ${label} in the first position with synchronous TypeError`, () => {
    assert.throws(() => add(value, 3), TypeError);
  });
  test(`ADD-04: reject ${label} in the second position with synchronous TypeError`, () => {
    assert.throws(() => add(3, value), TypeError);
  });
}

test('ADD-05: reject missing required arguments with synchronous TypeError', () => {
  assert.throws(() => add(), TypeError);
  assert.throws(() => add(1), TypeError);
});

test('ADD-06: reject objects without invoking implicit conversion or mutating them', () => {
  let conversions = 0;
  const value = Object.freeze({
    [Symbol.toPrimitive]() {
      conversions += 1;
      return 2;
    },
    valueOf() {
      conversions += 1;
      return 2;
    },
    toString() {
      conversions += 1;
      return '2';
    },
  });
  assert.throws(() => add(value, 3), TypeError);
  assert.throws(() => add(3, value), TypeError);
  assert.strictEqual(conversions, 0);
});

test('ADD-07: rejected calls leave subsequent and repeated valid calls usable', () => {
  for (const [, value] of invalidInputs) {
    assert.throws(() => add(value, 3), TypeError);
    assert.strictEqual(add(2, 3), 5);
    assert.throws(() => add(3, value), TypeError);
    assert.strictEqual(add(-2, 3), 1);
  }
  assert.strictEqual(add(2, 3), 5);
  assert.strictEqual(add(2, 3), 5);
});
