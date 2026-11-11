import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-177d0c8c/greeting.mjs';

// AC-GREET: synchronous, exact formatting; trim only the boundaries.
const validCases = [
  ['plain name', 'Ada', 'Hello, Ada!'],
  ['surrounding spaces', '  Ada  ', 'Hello, Ada!'],
  ['tab and newline boundaries', '\tAda\n', 'Hello, Ada!'],
  ['multiple words', ' Ada Lovelace ', 'Hello, Ada Lovelace!'],
  ['internal double spaces', ' Ada  Lovelace ', 'Hello, Ada  Lovelace!'],
  ['internal tabs and newlines', '\tAda\tLovelace\nByron\r\n', 'Hello, Ada\tLovelace\nByron!'],
  ['standard Unicode trim boundaries', '\u00a0\u2003\ufeffAda\u2028\u2029', 'Hello, Ada!'],
  ['case and Unicode preserved', '  aDa 李 👋 e\u0301  ', 'Hello, aDa 李 👋 e\u0301!'],
  ['single character', ' x ', 'Hello, x!'],
  ['string containing a number', ' 0 ', 'Hello, 0!'],
  ['punctuation preserved', ' Ada! ', 'Hello, Ada!!'],
  ['zero width space is not trimmed', '\u200b', 'Hello, \u200b!'],
];

for (const [label, input, expected] of validCases) {
  test(`AC-GREET: ${label}`, () => {
    assert.strictEqual(greeting(input), expected);
  });
}

// AC-INVALID: reject empty trimmed strings and all non-string types.
const invalidCases = [
  ['empty string', ''],
  ['spaces only', '   '],
  ['tabs and line endings only', '\t\n\r'],
  ['Unicode whitespace only', '\u00a0\u2003\ufeff\u2028\u2029'],
  ['undefined', undefined],
  ['null', null],
  ['zero', 0],
  ['number', 42],
  ['NaN', NaN],
  ['true', true],
  ['false', false],
  ['object', {}],
  ['empty array', []],
  ['array containing a name', ['Ada']],
  ['function', () => 'Ada'],
  ['symbol', Symbol('Ada')],
  ['bigint', 1n],
  ['boxed string', new String('Ada')],
];

for (const [label, input] of invalidCases) {
  test(`AC-INVALID: ${label} synchronously throws TypeError`, () => {
    assert.throws(() => greeting(input), TypeError);
  });
}

test('AC-INVALID: omitted argument synchronously throws TypeError', () => {
  assert.throws(() => greeting(), TypeError);
});

test('AC-INVALID: reject objects before coercion or access to trim', () => {
  const accesses = [];
  const input = Object.freeze({
    get trim() {
      accesses.push('trim');
      throw new Error('trim must not be read');
    },
    toString() {
      accesses.push('toString');
      return 'Ada';
    },
    valueOf() {
      accesses.push('valueOf');
      return 'Ada';
    },
    [Symbol.toPrimitive]() {
      accesses.push('Symbol.toPrimitive');
      return 'Ada';
    },
  });

  assert.throws(() => greeting(input), TypeError);
  assert.deepStrictEqual(accesses, []);
});

test('AC-GREET/AC-INVALID: repeated and failed calls do not affect later results', () => {
  assert.strictEqual(greeting(' Ada '), 'Hello, Ada!');
  assert.throws(() => greeting(' \t\n '), TypeError);
  assert.strictEqual(greeting(' Grace '), 'Hello, Grace!');
  assert.throws(() => greeting(null), TypeError);
  assert.strictEqual(greeting(' Ada '), 'Hello, Ada!');
});
