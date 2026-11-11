import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../../src/standard-81f088a2/add.mjs';

test('increment 1: finite number addition', () => {
  for (const [a, b, expected] of [[2, 3, 5], [-2, 3, 1], [0, 0, 0], [0.5, 0.25, 0.75]]) {
    assert.strictEqual(add(a, b), expected);
  }
});

test('increment 2: reject invalid inputs and recover after errors', () => {
  for (const value of ['2', null, undefined, true, false, {}, [], 2n, Symbol('invalid'), NaN, Infinity, -Infinity]) {
    assert.throws(() => add(value, 3), TypeError);
    assert.strictEqual(add(2, 3), 5);
    assert.throws(() => add(3, value), TypeError);
    assert.strictEqual(add(-2, 3), 1);
  }
  assert.throws(() => add(), TypeError);
  assert.throws(() => add(1), TypeError);
  assert.strictEqual(add(2, 3), 5);
});
