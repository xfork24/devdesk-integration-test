import test from 'node:test';
import assert from 'node:assert/strict';

// Independent public-interface assertions; no Task test helpers or fixtures.
test('Feature greeting acceptance (AC-GREET, AC-INVALID)', async (t) => {
  let api;
  try {
    api = await import('../../src/workflow-v4-8852bd89/greeting.mjs');
  } catch (error) {
    // Delivery/loading failure, not an executed business case. Retain the
    // original diagnostic to distinguish missing files, syntax and dependencies.
    assert.fail(`Feature module load failed [${error.code ?? error.name}]: ${error.stack ?? error}`);
  }

  await t.test('public entry provides a named function', () => {
    assert.strictEqual(typeof api.greeting, 'function');
  });
  if (typeof api.greeting !== 'function') return;
  const { greeting } = api;

  await t.test('AC-GREET: exact synchronous greeting and boundary trimming', () => {
    for (const [name, expected] of [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\tAda\n', 'Hello, Ada!'],
      ['Ada Lovelace', 'Hello, Ada Lovelace!'],
      ['\r\n\u00a0\uFEFFGrace\u3000', 'Hello, Grace!'],
      [' A ', 'Hello, A!'],
    ]) {
      assert.strictEqual(greeting(name), expected, JSON.stringify(name));
    }
  });

  await t.test('AC-GREET: internal whitespace, case and Unicode stay intact', () => {
    for (const [name, expected] of [
      ['  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
      [' aDa\t\nLOVE ', 'Hello, aDa\t\nLOVE!'],
      ['  你好 👋  ', 'Hello, 你好 👋!'],
      [' e\u0301 ', 'Hello, e\u0301!'],
      ['\u200b', 'Hello, \u200b!'],
    ]) {
      assert.strictEqual(greeting(name), expected, JSON.stringify(name));
    }
  });

  await t.test('AC-INVALID: blank primitive strings throw synchronously', () => {
    for (const name of ['', ' ', '    ', '\t', '\n', ' \r\n\t ', '\u00a0\uFEFF\u3000']) {
      assert.throws(() => greeting(name), TypeError, JSON.stringify(name));
    }
  });

  await t.test('AC-INVALID: omitted and non-string inputs throw synchronously', () => {
    assert.throws(() => greeting(), TypeError);
    for (const value of [
      undefined, null, 0, 17, NaN, Infinity, true, false,
      {}, [], ['Ada'], new String('Ada'), () => 'Ada', Symbol('Ada'), 1n,
    ]) {
      assert.throws(() => greeting(value), TypeError);
    }
  });

  await t.test('AC-INVALID: rejects objects without trimming or coercing them', () => {
    const calls = [];
    const value = {
      trim() { calls.push('trim'); return 'Ada'; },
      toString() { calls.push('toString'); return 'Ada'; },
      valueOf() { calls.push('valueOf'); return 'Ada'; },
      [Symbol.toPrimitive]() { calls.push('toPrimitive'); return 'Ada'; },
    };
    assert.throws(() => greeting(value), TypeError);
    assert.deepStrictEqual(calls, []);
  });

  await t.test('AC-GREET / AC-INVALID: caller recovers and calls remain independent', () => {
    const original = '  Ada  ';
    assert.strictEqual(greeting(original), 'Hello, Ada!');
    assert.throws(() => greeting(null), TypeError);
    assert.strictEqual(greeting('Grace'), 'Hello, Grace!');
    assert.throws(() => greeting('\t\n'), TypeError);
    assert.strictEqual(greeting(original), 'Hello, Ada!');
    assert.strictEqual(greeting(original), 'Hello, Ada!');
    assert.strictEqual(original, '  Ada  ');
  });
});
