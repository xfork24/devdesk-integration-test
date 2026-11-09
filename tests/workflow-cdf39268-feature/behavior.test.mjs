import test from 'node:test';
import assert from 'node:assert/strict';

// Context 9eab17ca-f793-4c2e-8988-446beb187a46 r2 authorizes registering
// the unchanged Task suite alongside the independent Feature cases below.
import '../workflow-cdf39268/behavior.test.mjs';

// Independent Feature acceptance: test plan 0fdd78b5-4eed-47a1-b23a-2231a95d4f69 v1.
// Requirement 5def743f-663c-4e58-b97b-588621266552 v1; design
// 667db527-cea4-4e9a-a3dd-18a3326b0677 v1. Feature assertions remain independent.
test('Feature greeting acceptance [AC-GREET, AC-INVALID]', async (t) => {
  const target = new URL('../../src/workflow-cdf39268-greeting.mjs', import.meta.url);
  let namespace;
  try {
    namespace = await import(target.href);
  } catch (error) {
    // ERR_MODULE_NOT_FOUND alone also describes a missing transitive dependency.
    // Require the loader's exact missing URL before classifying target absence.
    const targetMissing = error?.code === 'ERR_MODULE_NOT_FOUND'
      && error?.url === target.href;
    const classification = targetMissing
      ? 'TARGET_MODULE_MISSING'
      : 'OTHER_IMPORT_ERROR';
    assert.fail(
      `${classification}: ${target.href}; behavior cases have not executed.\n`
      + `Original name: ${error?.name ?? 'unknown'}\n`
      + `Original code: ${error?.code ?? 'none'}\n`
      + `Original URL: ${error?.url ?? 'unavailable'}\n`
      + `Original message: ${error?.message ?? String(error)}\n`
      + `Original stack: ${error?.stack ?? 'unavailable'}`,
    );
  }

  assert.strictEqual(typeof namespace.greeting, 'function', 'Required named export: greeting');
  const greet = namespace.greeting;

  const greetings = [
    ['ordinary name', 'Alice', 'Hello, Alice!'],
    ['one character', 'a', 'Hello, a!'],
    ['boundary spaces', '  Alice  ', 'Hello, Alice!'],
    ['boundary control whitespace', '\tAlice\r\n', 'Hello, Alice!'],
    ['boundary Unicode whitespace', '\u00a0\ufeffAlice\u3000', 'Hello, Alice!'],
    ['internal repeated spaces', '  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
    ['internal tab', ' A\tB ', 'Hello, A\tB!'],
    ['internal newline', ' A\nB ', 'Hello, A\nB!'],
    ['Unicode name', ' 李雷 ', 'Hello, 李雷!'],
    ['case and punctuation', ' aLiCe!? ', 'Hello, aLiCe!?!'],
    ['non-trim zero width boundaries', '\u200bA\u200b', 'Hello, \u200bA\u200b!'],
    ['zero width only is nonblank', '\u200b', 'Hello, \u200b!'],
  ];
  for (const [label, input, expected] of greetings) {
    await t.test(`AC-GREET / ${label}`, () => {
      assert.strictEqual(greet(input), expected);
    });
  }

  const rejected = [
    ['empty string', ''],
    ['single space', ' '],
    ['control whitespace', '\t\r\n'],
    ['Unicode whitespace', '\u00a0\ufeff\u3000'],
    ['undefined', undefined],
    ['null', null],
    ['boolean true', true],
    ['boolean false', false],
    ['number zero', 0],
    ['negative number', -1],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['object', {}],
    ['empty array', []],
    ['name array', ['Alice']],
    ['symbol', Symbol('name')],
    ['bigint', 1n],
    ['function', function name() {}],
    ['boxed string', new String('Alice')],
  ];
  for (const [label, input] of rejected) {
    await t.test(`AC-INVALID / ${label}`, () => {
      assert.throws(() => greet(input), TypeError);
    });
  }

  await t.test('AC-INVALID / omitted argument', () => {
    assert.throws(() => greet(), TypeError);
  });

  for (const hook of ['toString', 'valueOf', Symbol.toPrimitive]) {
    const label = typeof hook === 'symbol' ? 'Symbol.toPrimitive' : hook;
    await t.test(`AC-INVALID / no execution of ${label}`, () => {
      let calls = 0;
      const input = {
        [hook]() {
          calls += 1;
          throw new Error('Conversion is forbidden');
        },
      };
      try {
        assert.throws(() => greet(input), TypeError);
      } finally {
        assert.strictEqual(calls, 0, 'Input conversion hook must remain uncalled');
      }
    });
  }

  await t.test('AC-GREET + AC-INVALID / recovery and repeatability', () => {
    assert.throws(() => greet(' \t '), TypeError);
    assert.strictEqual(greet(' Alice '), 'Hello, Alice!');
    assert.throws(() => greet(null), TypeError);
    assert.strictEqual(greet(' Bob '), 'Hello, Bob!');
    assert.strictEqual(greet(' Alice '), 'Hello, Alice!');
  });
});
