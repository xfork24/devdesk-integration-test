import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../src/workflow-v5-177d0c8c/greeting.mjs';

test('AC-GREET: format and trim boundaries while preserving internal whitespace', () => {
  for (const [input, expected] of [
    ['Ada', 'Hello, Ada!'],
    ['  Ada  ', 'Hello, Ada!'],
    ['\tAda\n', 'Hello, Ada!'],
    [' Ada Lovelace ', 'Hello, Ada Lovelace!'],
    [' Ada  Lovelace ', 'Hello, Ada  Lovelace!'],
  ]) {
    assert.strictEqual(greeting(input), expected);
  }
});

test('AC-INVALID: reject empty names and non-strings with TypeError', () => {
  for (const input of ['', '   ', '\t\n', undefined, null, 42, true, false,
    {}, [], () => 'Ada', Symbol('Ada'), 1n, new String('Ada')]) {
    assert.throws(() => greeting(input), TypeError);
  }
  assert.throws(() => greeting(), TypeError);
});
