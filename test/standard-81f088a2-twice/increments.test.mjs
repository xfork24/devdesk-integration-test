import test from 'node:test';
import assert from 'node:assert/strict';
import { twice } from '../../src/standard-81f088a2/twice.mjs';

test('increment 1: normal arithmetic', () => {
  for (const [input, expected] of [[3, 6], [-3, -6], [0, 0], [0.5, 1]]) {
    assert.strictEqual(twice(input), expected);
  }
});

test('increment 2: rejects invalid inputs and recovers', () => {
  for (const input of ['3', null, undefined, true, false, {}, [], 3n, Symbol('3'), NaN, Infinity, -Infinity]) {
    assert.throws(() => twice(input), TypeError);
    assert.strictEqual(twice(3), 6);
  }
  assert.throws(() => twice(), TypeError);
  assert.strictEqual(twice(-3), -6);
});
