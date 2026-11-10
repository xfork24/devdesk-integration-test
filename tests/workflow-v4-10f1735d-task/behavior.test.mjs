import test from 'node:test';
import assert from 'node:assert/strict';

// Task recipe: node --test tests/workflow-v4-10f1735d-task/behavior.test.mjs
// No fixtures, dependencies, or external services are needed.
test('greeting Task: AC-GREET and AC-INVALID', async (t) => {
  const target = new URL('../../src/workflow-v4-10f1735d/greeting.mjs', import.meta.url);
  let module;
  try {
    module = await import(target.href);
  } catch (error) {
    const missingTarget = error.code === 'ERR_MODULE_NOT_FOUND' && error.url === target.href;
    assert.fail(missingTarget
      ? `Missing greeting implementation: ${target.href}`
      : `Unexpected module loading failure (not a missing-implementation Red): ${error.stack ?? error}`);
  }
  assert.equal(typeof module.greeting, 'function', 'named export greeting must be a function');
  const { greeting } = module;

  await t.test('AC-GREET: exact synchronous output and trim semantics', () => {
    const cases = [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\t\nGrace\r\n', 'Hello, Grace!'],
      ['  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
      ['\tA\tB\nC\r', 'Hello, A\tB\nC!'],
      ['\u00a0\u2003Zoë\ufeff', 'Hello, Zoë!'],
      ['李雷 👋', 'Hello, 李雷 👋!'],
      ['e\u0301', 'Hello, e\u0301!'],
      ['aDa!', 'Hello, aDa!!'],
      ['x', 'Hello, x!'],
      ['\u200b', 'Hello, \u200b!'],
    ];
    for (const [input, expected] of cases) {
      const actual = greeting(input);
      assert.equal(typeof actual, 'string', 'must return a primitive string synchronously');
      assert.equal(actual, expected, `input ${JSON.stringify(input)}`);
    }
  });

  await t.test('AC-INVALID: empty and whitespace-only strings throw TypeError synchronously', () => {
    for (const value of ['', ' ', '   ', '\t\n', '\r\n\t ', '\u00a0\u2003\ufeff']) {
      assert.throws(() => greeting(value), TypeError, `input ${JSON.stringify(value)}`);
    }
  });

  await t.test('AC-INVALID: reject every non-string category and omitted argument', () => {
    const cases = [
      ['null', null], ['undefined', undefined], ['zero', 0], ['number', 42],
      ['NaN', NaN], ['infinity', Infinity], ['true', true], ['false', false],
      ['object', {}], ['array', []], ['string array', ['Ada']],
      ['function', () => 'Ada'], ['symbol', Symbol('Ada')], ['bigint', 1n],
      ['boxed string', new String('Ada')],
    ];
    for (const [label, value] of cases) {
      assert.throws(() => greeting(value), TypeError, label);
    }
    assert.throws(() => greeting(), TypeError, 'omitted argument');
  });

  await t.test('AC-INVALID: type check precedes coercion or a trim method call', () => {
    const touched = [];
    const input = {
      get trim() { touched.push('trim'); throw new Error('trim accessed'); },
      toString() { touched.push('toString'); throw new Error('coerced'); },
      valueOf() { touched.push('valueOf'); throw new Error('coerced'); },
      [Symbol.toPrimitive]() { touched.push('toPrimitive'); throw new Error('coerced'); },
    };
    assert.throws(() => greeting(input), TypeError);
    assert.deepEqual(touched, [], 'non-string inputs must be rejected without conversion');
  });

  await t.test('AC-GREET / AC-INVALID: repeated and interleaved calls remain independent', () => {
    for (let i = 0; i < 3; i += 1) {
      assert.equal(greeting('  Ada\n'), 'Hello, Ada!');
      assert.throws(() => greeting(' \t'), TypeError);
      assert.equal(greeting('Grace'), 'Hello, Grace!');
      assert.throws(() => greeting(null), TypeError);
      assert.equal(greeting('  Ada\n'), 'Hello, Ada!');
    }
  });
});
