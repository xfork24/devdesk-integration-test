import test from 'node:test';
import assert from 'node:assert/strict';

test('greeting Task public contract', async (t) => {
  let target;
  try {
    target = await import('../../src/workflow-v4-4c3a9f27/greeting.mjs');
  } catch (error) {
    assert.fail(`Target module import failed (${error.code ?? error.name}): ${error.message}`);
  }
  assert.equal(typeof target.greeting, 'function', 'named export greeting must be callable');
  const { greeting } = target;

  await t.test('AC-GREET: exact synchronous greetings and preserved interior text', () => {
    const cases = [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      [' Ada Lovelace ', 'Hello, Ada Lovelace!'],
      ['  aDa  Lovelace  ', 'Hello, aDa  Lovelace!'],
      ['\t\nAda\r\n', 'Hello, Ada!'],
      ['\u00a0\u2003Ada\uFEFF', 'Hello, Ada!'],
      [' A\tB\nC ', 'Hello, A\tB\nC!'],
      [' 李 小龍 ', 'Hello, 李 小龍!'],
      [' x ', 'Hello, x!'],
    ];
    for (const [input, expected] of cases) {
      assert.equal(greeting(input), expected, JSON.stringify(input));
    }
  });

  await t.test('AC-INVALID: empty and whitespace-only primitive strings throw synchronously', () => {
    for (const input of ['', ' ', '   ', '\t\n', '\r\n\t ', '\u00a0\u2003\uFEFF']) {
      assert.throws(() => greeting(input), TypeError, JSON.stringify(input));
    }
  });

  await t.test('AC-INVALID: non-string types and omitted argument throw synchronously', () => {
    const cases = [
      undefined, null, 0, 42, NaN, Infinity, true, false,
      {}, [], ['Ada'], new String('Ada'), Symbol('Ada'), 1n, () => 'Ada',
    ];
    for (const input of cases) {
      assert.throws(() => greeting(input), TypeError);
    }
    assert.throws(() => greeting(), TypeError);
  });

  await t.test('AC-INVALID: reject objects before property access or coercion', () => {
    const accesses = [];
    const input = Object.freeze(Object.defineProperties({}, {
      trim: { get() { accesses.push('trim'); throw new Error('trim accessed'); } },
      toString: { get() { accesses.push('toString'); throw new Error('toString accessed'); } },
      valueOf: { get() { accesses.push('valueOf'); throw new Error('valueOf accessed'); } },
      [Symbol.toPrimitive]: {
        get() { accesses.push('toPrimitive'); throw new Error('coercion accessed'); },
      },
    }));
    assert.throws(() => greeting(input), TypeError);
    assert.deepEqual(accesses, [], 'invalid objects must not be inspected or coerced');
  });

  await t.test('AC-GREET / AC-INVALID: repeated calls and recovery require no reset', () => {
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.throws(() => greeting(null), TypeError);
    assert.equal(greeting('Grace'), 'Hello, Grace!');
    assert.throws(() => greeting('\t'), TypeError);
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
    assert.equal(greeting(' Ada '), 'Hello, Ada!');
  });
});
