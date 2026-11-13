import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-b55d65d7/greeting.mjs';

test('AC-GREET: returns the exact greeting for primitive strings', () => {
  assert.equal(greeting('Ada'), 'Hello, Ada!');
  assert.equal(greeting('Ada Lovelace'), 'Hello, Ada Lovelace!');
  assert.equal(greeting('A'), 'Hello, A!');
});

test('AC-GREET: trims standard JavaScript whitespace at both ends', () => {
  for (const name of [' Ada ', '\t\r\nAda\n\t', '\u00a0\u2003\ufeffAda\u2028\u2029']) {
    assert.equal(greeting(name), 'Hello, Ada!');
  }
});

test('AC-GREET: preserves internal whitespace and other content', () => {
  assert.equal(greeting('  Ada  Lovelace  '), 'Hello, Ada  Lovelace!');
  assert.equal(greeting('\tAda\t\nLovelace\r\n'), 'Hello, Ada\t\nLovelace!');
  assert.equal(greeting('  aDa, 世界! e\u0301  '), 'Hello, aDa, 世界! e\u0301!');
  assert.equal(greeting('\u200b'), 'Hello, \u200b!');
});

test('AC-INVALID: rejects empty and whitespace-only strings with TypeError', () => {
  for (const name of ['', ' ', '   ', '\t\r\n', '\u00a0\u2003\ufeff\u2028\u2029']) {
    assert.throws(() => greeting(name), TypeError);
  }
});

test('AC-INVALID: rejects every non-string category with TypeError', () => {
  const invalidNames = [
    undefined, null, 0, 42, NaN, Infinity, false, true,
    {}, [], ['Ada'], () => 'Ada', Symbol('Ada'), 1n,
    new String('Ada'), new String(''),
    { trim: () => 'Ada' },
  ];
  for (const name of invalidNames) {
    assert.throws(() => greeting(name), TypeError);
  }
});

test('AC-INVALID: rejects an omitted argument with TypeError', () => {
  assert.throws(() => greeting(), TypeError);
});

test('AC-INVALID: rejects objects before accessing trim or conversion hooks', () => {
  const accessed = [];
  const name = Object.defineProperties({}, {
    trim: { get() { accessed.push('trim'); return () => 'Ada'; } },
    toString: { get() { accessed.push('toString'); return () => 'Ada'; } },
    valueOf: { get() { accessed.push('valueOf'); return () => 'Ada'; } },
    [Symbol.toPrimitive]: {
      get() { accessed.push('Symbol.toPrimitive'); return () => 'Ada'; },
    },
  });
  assert.throws(() => greeting(name), TypeError);
  assert.deepEqual(accessed, []);
});

test('AC-GREET / AC-INVALID: interleaved repeated calls remain deterministic', () => {
  for (let iteration = 0; iteration < 3; iteration += 1) {
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.throws(() => greeting(' \t '), TypeError);
    assert.equal(greeting('Grace  Hopper'), 'Hello, Grace  Hopper!');
    assert.throws(() => greeting(new String('Ada')), TypeError);
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
  }
});
