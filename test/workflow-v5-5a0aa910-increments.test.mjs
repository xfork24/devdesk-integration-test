import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../src/workflow-v5-5a0aa910/greeting.mjs';

test('AC-GREET: exact greeting, boundary trim and internal spaces', () => {
  assert.equal(greeting('Alice'), 'Hello, Alice!');
  assert.equal(greeting('  Alice  '), 'Hello, Alice!');
  assert.equal(greeting(' A  B '), 'Hello, A  B!');
});

test('AC-INVALID: rejects blank and non-string inputs', () => {
  for (const input of ['', ' \t\n', undefined, null, 0, true, {}, [], Symbol('name'), 1n, new String('Alice')]) {
    assert.throws(() => greeting(input), TypeError);
  }
  assert.throws(() => greeting(), TypeError);
});
