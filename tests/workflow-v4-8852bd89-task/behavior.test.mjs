import test from 'node:test';
import assert from 'node:assert/strict';

test('greeting public contract (AC-GREET, AC-INVALID)', async (t) => {
  let publicModule;
  try {
    publicModule = await import('../../src/workflow-v4-8852bd89/greeting.mjs');
  } catch (error) {
    // Loading failures stop this suite before any business assertions run.
    // Keep the original code and stack to distinguish missing delivery from
    // syntax errors or missing transitive dependencies.
    assert.fail(`Module loading failed [${error.code ?? error.name}]: ${error.stack ?? error}`);
  }

  await t.test('public ESM named export is a function', () => {
    assert.equal(typeof publicModule.greeting, 'function');
  });
  // Do not execute behavior cases if the public export is missing.
  if (typeof publicModule.greeting !== 'function') return;
  const { greeting } = publicModule;

  await t.test('AC-GREET: trims boundaries and returns exact synchronous text', () => {
    const cases = [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\tAda\n', 'Hello, Ada!'],
      ['Ada Lovelace', 'Hello, Ada Lovelace!'],
      ['  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
      ['\u00a0\uFEFFAda\u3000', 'Hello, Ada!'],
      ['  aDa\tLovelace  ', 'Hello, aDa\tLovelace!'],
      ['  你好  ', 'Hello, 你好!'],
      ['  e\u0301  ', 'Hello, e\u0301!'],
    ];
    for (const [input, expected] of cases) {
      assert.strictEqual(greeting(input), expected, JSON.stringify(input));
    }
  });

  await t.test('AC-INVALID: rejects omitted and non-string inputs synchronously', () => {
    assert.throws(() => greeting(), TypeError, 'omitted argument');
    const cases = [
      ['undefined', undefined], ['null', null], ['zero', 0],
      ['number', 42], ['NaN', NaN], ['true', true], ['false', false],
      ['object', {}], ['array', []], ['string array', ['Ada']],
      ['boxed string', new String('Ada')], ['function', () => 'Ada'],
      ['symbol', Symbol('Ada')], ['bigint', 1n],
    ];
    for (const [label, input] of cases) {
      assert.throws(() => greeting(input), TypeError, label);
    }
  });

  await t.test('AC-INVALID: checks type before invoking object hooks', () => {
    const invoked = [];
    const input = {
      trim() { invoked.push('trim'); return 'Ada'; },
      toString() { invoked.push('toString'); return 'Ada'; },
      [Symbol.toPrimitive]() { invoked.push('toPrimitive'); return 'Ada'; },
    };
    assert.throws(() => greeting(input), TypeError);
    assert.deepStrictEqual(invoked, []);
  });

  await t.test('AC-INVALID: rejects empty and whitespace-only strings', () => {
    for (const input of ['', ' ', '   ', '\t', '\n', '\r\n\t ', '\u00a0\uFEFF\u3000']) {
      assert.throws(() => greeting(input), TypeError, JSON.stringify(input));
    }
  });

  await t.test('AC-GREET / AC-INVALID: failures and repeated calls remain independent', () => {
    assert.throws(() => greeting(null), TypeError);
    assert.strictEqual(greeting('  Ada  '), 'Hello, Ada!');
    assert.strictEqual(greeting('  Ada  '), 'Hello, Ada!');
    assert.strictEqual(greeting('Grace'), 'Hello, Grace!');
    assert.throws(() => greeting(' \t\n'), TypeError);
    assert.strictEqual(greeting('Ada'), 'Hello, Ada!');
  });
});
