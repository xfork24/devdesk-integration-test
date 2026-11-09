import test from 'node:test';
import assert from 'node:assert/strict';

// Task recipe: node --test tests/workflow-cdf39268/behavior.test.mjs
// AC-GREET / AC-INVALID; requirement 5def743f-663c-4e58-b97b-588621266552 v1,
// design 667db527-cea4-4e9a-a3dd-18a3326b0677 v1,
// Task test definition b3ad2dc6-c233-4fe9-ba72-a5a646491a7c v1.
// Import failure is a prerequisite failure: behavior cases have not run.
// The coordinator must inspect the original diagnostic to distinguish missing
// target, missing transitive dependency, syntax error and execution failure.
test('greeting public contract [AC-GREET, AC-INVALID]', async (t) => {
  let namespace;
  try {
    namespace = await import('../../src/workflow-cdf39268-greeting.mjs');
  } catch (error) {
    assert.fail(
      'Cannot import src/workflow-cdf39268-greeting.mjs; behavior not executed.\n' +
      `Original name: ${error?.name ?? 'unknown'}\n` +
      `Original code: ${error?.code ?? 'none'}\n` +
      `Original message: ${error?.message ?? String(error)}\n` +
      `Original stack: ${error?.stack ?? 'unavailable'}`,
    );
  }

  assert.strictEqual(typeof namespace.greeting, 'function',
    'The module must expose the named function greeting');
  const { greeting } = namespace;

  const validCases = [
    ['ordinary name', 'Alice', 'Hello, Alice!'],
    ['single character', 'a', 'Hello, a!'],
    ['boundary spaces', '  Alice  ', 'Hello, Alice!'],
    ['boundary tabs and line endings', '\tAlice\r\n', 'Hello, Alice!'],
    ['Unicode trim whitespace', '\u00A0\uFEFFAlice\u3000', 'Hello, Alice!'],
    ['internal repeated spaces', '  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
    ['internal tab', ' A\tB ', 'Hello, A\tB!'],
    ['internal newline', ' A\nB ', 'Hello, A\nB!'],
    ['Unicode name', ' 李雷 ', 'Hello, 李雷!'],
    ['zero width spaces are preserved', '\u200BA\u200B', 'Hello, \u200BA\u200B!'],
  ];
  for (const [label, input, expected] of validCases) {
    await t.test(`AC-GREET: ${label}`, () => {
      assert.strictEqual(greeting(input), expected);
    });
  }

  const invalidCases = [
    ['empty string', ''],
    ['space only', ' '],
    ['tabs and line endings only', '\t\r\n'],
    ['Unicode whitespace only', '\u00A0\uFEFF\u3000'],
    ['undefined', undefined],
    ['null', null],
    ['true', true],
    ['false', false],
    ['zero', 0],
    ['negative number', -1],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['plain object', {}],
    ['empty array', []],
    ['array containing name', ['Alice']],
    ['symbol', Symbol('Alice')],
    ['bigint', 1n],
    ['function', () => 'Alice'],
    ['boxed string', new String('Alice')],
  ];
  for (const [label, input] of invalidCases) {
    await t.test(`AC-INVALID: ${label}`, () => {
      assert.throws(() => greeting(input), TypeError);
    });
  }

  await t.test('AC-INVALID: omitted argument', () => {
    assert.throws(() => greeting(), TypeError);
  });

  for (const [label, key] of [
    ['toString', 'toString'],
    ['valueOf', 'valueOf'],
    ['Symbol.toPrimitive', Symbol.toPrimitive],
  ]) {
    await t.test(`AC-INVALID: reject object without invoking ${label}`, () => {
      let calls = 0;
      const input = {
        [key]() {
          calls += 1;
          throw new Error('Input conversion hook must not execute');
        },
      };
      try {
        assert.throws(() => greeting(input), TypeError);
      } finally {
        assert.strictEqual(calls, 0, 'No input conversion is allowed');
      }
    });
  }

  await t.test('AC-GREET / AC-INVALID: recovery and repeatability on one instance', () => {
    assert.throws(() => greeting(' \t '), TypeError);
    assert.strictEqual(greeting(' Alice '), 'Hello, Alice!');
    assert.throws(() => greeting(null), TypeError);
    assert.strictEqual(greeting(' Bob '), 'Hello, Bob!');
    assert.strictEqual(greeting(' Alice '), 'Hello, Alice!');
  });
});
