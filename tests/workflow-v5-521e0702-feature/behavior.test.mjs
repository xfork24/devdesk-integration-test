import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-521e0702/greeting.mjs';

// Code points make these actual whitespace characters, not literal backslash text.
const boundaryWhitespace = [
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x00a0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
  0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
].map((codePoint) => String.fromCodePoint(codePoint));

test('F-GREET: public ESM entry returns exact synchronous greetings', () => {
  for (const [input, expected] of [
    ['Ada', 'Hello, Ada!'],
    ['a', 'Hello, a!'],
    ['0', 'Hello, 0!'],
    ['  Ada  ', 'Hello, Ada!'],
    [' 李雷 ', 'Hello, 李雷!'],
    ['🙂', 'Hello, 🙂!'],
    ['  aDa  Lovelace  ', 'Hello, aDa  Lovelace!'],
  ]) {
    assert.equal(greeting(input), expected);
  }
});

test('F-TRIM: standard whitespace is removed at either boundary', () => {
  for (const whitespace of boundaryWhitespace) {
    assert.equal(greeting(whitespace + 'Ada'), 'Hello, Ada!');
    assert.equal(greeting('Ada' + whitespace), 'Hello, Ada!');
    assert.equal(greeting(whitespace + 'Ada' + whitespace), 'Hello, Ada!');
  }
  assert.equal(greeting(boundaryWhitespace.join('') + 'Ada' + boundaryWhitespace.join('')), 'Hello, Ada!');
});

test('F-CONTENT: internal whitespace and non-trim characters are preserved', () => {
  for (const whitespace of boundaryWhitespace) {
    assert.equal(greeting(' Ada' + whitespace + 'Lovelace '), 'Hello, Ada' + whitespace + 'Lovelace!');
  }
  const zeroWidthSpace = String.fromCodePoint(0x200b);
  assert.equal(greeting(' ' + zeroWidthSpace + ' '), 'Hello, ' + zeroWidthSpace + '!');
  assert.equal(greeting(String.raw` \tAda\n `), String.raw`Hello, \tAda\n!`);
});

test('F-EMPTY: empty and actual whitespace-only strings throw synchronously', () => {
  for (const input of ['', ...boundaryWhitespace, boundaryWhitespace.join('')]) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('F-TYPES: every non-string category is rejected without conversion', () => {
  assert.throws(() => greeting(), TypeError);
  for (const input of [
    undefined, null, false, true, 0, -1, 42, NaN, Infinity, 0n, 1n,
    Symbol('Ada'), {}, [], ['Ada'], () => 'Ada', new String('Ada'), new String(''),
  ]) {
    assert.throws(() => greeting(input), TypeError);
  }
});

test('F-NO-COERCION: rejection does not read or mutate input objects', () => {
  const accesses = [];
  const input = Object.create(null);
  for (const key of ['trim', 'toString', 'valueOf', Symbol.toPrimitive]) {
    Object.defineProperty(input, key, {
      get() {
        accesses.push(key);
        throw new Error('Input property must not be accessed');
      },
    });
  }
  Object.freeze(input);
  const before = Object.getOwnPropertyDescriptors(input);
  assert.throws(() => greeting(input), TypeError);
  assert.deepEqual(accesses, []);
  assert.deepEqual(Object.getOwnPropertyDescriptors(input), before);
});

test('F-RECOVERY: repeated successes and failures remain independent', () => {
  const tab = String.fromCodePoint(9);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.throws(() => greeting(tab), TypeError);
    assert.throws(() => greeting(tab), TypeError);
    assert.equal(greeting(' Grace '), 'Hello, Grace!');
    assert.throws(() => greeting(new String('Ada')), TypeError);
    assert.throws(() => greeting(null), TypeError);
    assert.equal(greeting('Ada'), 'Hello, Ada!');
  }
});
