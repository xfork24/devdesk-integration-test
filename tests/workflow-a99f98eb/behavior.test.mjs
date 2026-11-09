import test from 'node:test';
import assert from 'node:assert/strict';

async function loadGreeting() {
  try {
    return await import('../../src/workflow-a99f98eb-greeting.mjs');
  } catch (error) {
    assert.fail(`Unable to import greeting module: ${error?.stack ?? error}`);
  }
}

test('greeting satisfies AC-GREET and AC-INVALID', async (t) => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function', 'named export greeting must be a function');

  await t.test('AC-GREET: trims surrounding whitespace and preserves name content', () => {
    assert.equal(greeting('Ada'), 'Hello, Ada!');
    assert.equal(greeting('  Ada  '), 'Hello, Ada!');
    assert.equal(greeting('\t\nAda\r\n'), 'Hello, Ada!');
    assert.equal(greeting('  aDa  Lovelace  '), 'Hello, aDa  Lovelace!');
    assert.equal(greeting('\u00a0\u2003Ada\u202f\ufeff'), 'Hello, Ada!');
    assert.equal(greeting(' A\tB\nC '), 'Hello, A\tB\nC!');
  });

  await t.test('AC-INVALID: rejects empty and whitespace-only strings', () => {
    for (const value of ['', ' ', '   ', '\t', '\n', '\r\n\t ', '\u00a0\u2003\u202f\ufeff']) {
      assert.throws(() => greeting(value), TypeError);
    }
  });

  await t.test('AC-INVALID: rejects all representative non-string types', () => {
    const values = [
      undefined, null, false, true, 0, 42, -1, NaN, Infinity,
      0n, Symbol('Ada'), [], ['Ada'], {}, { name: 'Ada' },
      () => 'Ada', new String('Ada'), new String(''),
    ];
    for (const value of values) {
      assert.throws(() => greeting(value), TypeError);
    }
    assert.throws(() => greeting(), TypeError);
  });

  await t.test('AC-INVALID: rejects objects before invoking coercion hooks', () => {
    const sentinel = new Error('coercion must not occur');
    let calls = 0;
    const rejectCoercion = () => {
      calls += 1;
      throw sentinel;
    };
    const value = {
      [Symbol.toPrimitive]: rejectCoercion,
      toString: rejectCoercion,
      valueOf: rejectCoercion,
    };
    assert.throws(() => greeting(value), TypeError);
    assert.equal(calls, 0, 'input must not be coerced');
  });
});
