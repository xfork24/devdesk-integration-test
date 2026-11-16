import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-521e0702/greeting.mjs';

test('AC-GREET: returns the exact synchronous greeting', () => {
  for (const name of ['Ada', 'a', 'Ada Lovelace', '李雷', '🙂', '0']) {
    assert.equal(greeting(name), `Hello, ${name}!`);
  }
});

test('AC-GREET: removes standard boundary whitespace only', () => {
  for (const name of [' Ada', 'Ada ', '  Ada  ', '\t\r\nAda\n\t', '\u00a0\u2003Ada\ufeff']) {
    assert.equal(greeting(name), 'Hello, Ada!');
  }
  for (const [input, expected] of [
    ['  aDa  Lovelace  ', 'Hello, aDa  Lovelace!'],
    ['\tAda\tLovelace\n', 'Hello, Ada\tLovelace!'],
    [' Ada\nLovelace ', 'Hello, Ada\nLovelace!'],
    [' \u200b ', 'Hello, \u200b!'],
  ]) {
    assert.equal(greeting(input), expected);
  }
});

test('AC-INVALID: empty and whitespace-only strings synchronously throw TypeError', () => {
  for (const input of ['', ' ', '   ', '\t', '\r\n', ' \t\r\n ', '\u00a0\u2003\ufeff']) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('AC-INVALID: rejects every non-string primitive and an omitted argument', () => {
  assert.throws(() => greeting(), TypeError);
  for (const input of [undefined, null, false, true, 0, 42, NaN, Infinity, 1n, Symbol('Ada')]) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('AC-INVALID: rejects objects, arrays, functions and boxed strings', () => {
  for (const input of [{}, [], ['Ada'], () => 'Ada', new String('Ada'), new String('')]) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('AC-INVALID: rejects objects before property access or coercion', () => {
  const accessed = [];
  const input = Object.create(null);
  for (const key of ['trim', 'toString', 'valueOf', Symbol.toPrimitive]) {
    Object.defineProperty(input, key, {
      get() {
        accessed.push(key);
        throw new Error('Unexpected property access');
      },
    });
  }
  assert.throws(() => greeting(input), TypeError);
  assert.deepEqual(accessed, []);
});

test('AC-GREET / AC-INVALID: repeated and interleaved calls remain independent', () => {
  for (let iteration = 0; iteration < 3; iteration += 1) {
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.throws(() => greeting(' \t '), TypeError);
    assert.throws(() => greeting(new String('Ada')), TypeError);
    assert.equal(greeting(' Grace '), 'Hello, Grace!');
    assert.equal(greeting('Ada'), 'Hello, Ada!');
  }
});
