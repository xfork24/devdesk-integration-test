import test from 'node:test';
import assert from 'node:assert/strict';

test('greeting Feature: independent public-contract verification', async (t) => {
  let module;
  try {
    module = await import('../../src/workflow-v4-a8003835/greeting.mjs');
  } catch (error) {
    assert.fail(`Feature target import failed (${error.code ?? error.name}): ${error.message}`);
  }
  assert.equal(typeof module.greeting, 'function', 'named greeting export is callable');

  await t.test('AC-GREET: callers receive exact strings with internal text preserved', () => {
    const cases = new Map([
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\tAda\n', 'Hello, Ada!'],
      ['Ada Lovelace', 'Hello, Ada Lovelace!'],
      ['  AdA  lovelace\n', 'Hello, AdA  lovelace!'],
      ['\uFEFF\u00a0Grace\u2029', 'Hello, Grace!'],
      ['\nA\nB\tC\t', 'Hello, A\nB\tC!'],
      [' 王芳 ', 'Hello, 王芳!'],
    ]);
    for (const [input, expected] of cases) {
      const result = module.greeting(input);
      assert.equal(typeof result, 'string', 'return is synchronous');
      assert.equal(result, expected);
      assert.equal(module.greeting(input), expected, 'repeat call is deterministic');
    }
  });

  await t.test('AC-INVALID: invalid calls throw synchronously, then callers can recover', () => {
    const invalidCalls = [
      () => module.greeting(),
      ...['', ' ', '   ', '\t', '\n', '\r\t\n', '\uFEFF\u00a0\u2029',
        undefined, null, 0, -1, NaN, Infinity, false, true, {}, [], ['Ada'],
        new String('Ada'), Symbol('name'), 0n, function name() {}]
        .map((input) => () => module.greeting(input)),
    ];
    for (const call of invalidCalls) {
      assert.throws(call, TypeError);
      assert.equal(module.greeting('  Ada  '), 'Hello, Ada!');
    }
  });

  await t.test('AC-INVALID: string-like objects cannot bypass primitive type validation', () => {
    const observed = [];
    const stringLike = {
      trim() { observed.push('trim'); return 'Ada'; },
      toString() { observed.push('toString'); return 'Ada'; },
      valueOf() { observed.push('valueOf'); return 'Ada'; },
      [Symbol.toPrimitive]() { observed.push('toPrimitive'); return 'Ada'; },
    };
    assert.throws(() => module.greeting(stringLike), TypeError);
    assert.deepEqual(observed, []);
    assert.equal(module.greeting('Grace'), 'Hello, Grace!');
  });
});
