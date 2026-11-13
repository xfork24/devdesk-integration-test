import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../src/workflow-v5-b55d65d7/greeting.mjs';

test('increment 1: exact greeting, trim and preserved internal content', () => {
  assert.equal(greeting('Ada'), 'Hello, Ada!');
  assert.equal(greeting(' \tAda\n '), 'Hello, Ada!');
  assert.equal(greeting('Ada Lovelace'), 'Hello, Ada Lovelace!');
  assert.equal(greeting('  Ada  Lovelace  '), 'Hello, Ada  Lovelace!');
  assert.equal(greeting('\u00a0Ada\tLovelace\ufeff'), 'Hello, Ada\tLovelace!');
});

test('increment 2: rejects empty strings and non-primitive strings', () => {
  for (const name of ['', ' \t\n ', '\u00a0\ufeff', undefined, null, 0, NaN,
    true, false, {}, [], () => {}, Symbol('Ada'), 1n, new String('Ada')]) {
    assert.throws(() => greeting(name), TypeError);
  }
  assert.throws(() => greeting(), TypeError);
});
