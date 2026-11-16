import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../src/workflow-v5-521e0702/greeting.mjs';

test('increment 1: exact greeting and boundary trim preserve internal whitespace', () => {
  for (const [input, expected] of [
    ['Ada', 'Hello, Ada!'],
    ['  Ada  ', 'Hello, Ada!'],
    ['\tAda\n', 'Hello, Ada!'],
    ['Ada Lovelace', 'Hello, Ada Lovelace!'],
    ['  aDa  Lovelace  ', 'Hello, aDa  Lovelace!'],
  ]) {
    assert.equal(greeting(input), expected);
  }
});

test('increment 2: rejects empty and whitespace-only strings', () => {
  for (const input of ['', ' ', '\t\r\n', '\u00a0\u2003\ufeff']) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('increment 2: rejects non-string values including boxed strings', () => {
  assert.throws(() => greeting(), TypeError);
  for (const input of [undefined, null, false, true, 0, 42, NaN, Infinity, 1n, Symbol('Ada'), {}, [], ['Ada'], () => 'Ada', new String('Ada'), new String('')]) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('increment 2: rejects before accessing object methods', () => {
  let accesses = 0;
  const input = Object.create(null);
  for (const key of ['trim', 'toString', 'valueOf', Symbol.toPrimitive]) {
    Object.defineProperty(input, key, { get() { accesses += 1; throw new Error('accessed'); } });
  }
  assert.throws(() => greeting(input), TypeError);
  assert.equal(accesses, 0);
});

test('increment 2: repeated invalid calls do not affect valid calls', () => {
  for (let i = 0; i < 3; i += 1) {
    assert.throws(() => greeting(' \t '), TypeError);
    assert.throws(() => greeting(new String('Ada')), TypeError);
    assert.equal(greeting(' Grace '), 'Hello, Grace!');
    assert.equal(greeting('Ada'), 'Hello, Ada!');
  }
});
