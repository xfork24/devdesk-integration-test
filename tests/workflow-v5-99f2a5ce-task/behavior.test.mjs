import test from 'node:test';
import assert from 'node:assert/strict';

// Task-only recipe: node --test tests/workflow-v5-99f2a5ce-task/behavior.test.mjs
// No fixtures, external services, or third-party dependencies.
test('greeting Task contract: AC-GREET and AC-INVALID', async (t) => {
  const target = new URL('../../src/workflow-v5-99f2a5ce/greeting.mjs', import.meta.url);
  let exports;
  try {
    exports = await import('../../src/workflow-v5-99f2a5ce/greeting.mjs');
  } catch (error) {
    const category = error?.code === 'ERR_MODULE_NOT_FOUND' && error?.url === target.href
      ? 'Target implementation missing (explicit workflow Red convention)'
      : 'Other loading failure; not evidence of missing implementation';
    assert.fail(`${category}\nTarget: ${target.href}\nOriginal error: ${error?.stack ?? error}\nCode: ${error?.code ?? 'none'}`);
  }
  assert.equal(typeof exports.greeting, 'function', 'ESM must expose named function greeting');
  const { greeting } = exports;

  await t.test('AC-GREET: exact primitive string output, standard trim, preserved content', () => {
    const examples = [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\tAda\n', 'Hello, Ada!'],
      [' Ada Lovelace ', 'Hello, Ada Lovelace!'],
      ['  Ada   Lovelace  ', 'Hello, Ada   Lovelace!'],
      ['\r\nA\tB\nC\r', 'Hello, A\tB\nC!'],
      ['\u00a0\u2003Ada\ufeff', 'Hello, Ada!'],
      ['aDa', 'Hello, aDa!'],
      [' 李雷 👋 ', 'Hello, 李雷 👋!'],
      [' e\u0301 ', 'Hello, e\u0301!'],
      ['<Ada>&!', 'Hello, <Ada>&!!'],
      ['x', 'Hello, x!'],
      ['\u200b', 'Hello, \u200b!'],
    ];
    for (const [name, expected] of examples) {
      const result = greeting(name);
      assert.equal(typeof result, 'string', 'return must be a primitive string synchronously');
      assert.equal(result, expected, `AC-GREET input ${JSON.stringify(name)}`);
    }
  });

  await t.test('AC-INVALID: empty and trim-empty strings synchronously throw TypeError', () => {
    for (const name of ['', ' ', '   ', '\t\n', ' \r\n\t ', '\u00a0\u2003\ufeff']) {
      assert.throws(() => greeting(name), TypeError, `AC-INVALID input ${JSON.stringify(name)}`);
    }
  });

  await t.test('AC-INVALID: reject omitted input and all non-string types without coercion', () => {
    assert.throws(() => greeting(), TypeError, 'omitted argument');
    const invalid = [
      ['undefined', undefined], ['null', null], ['zero', 0], ['number', 7],
      ['NaN', NaN], ['Infinity', Infinity], ['true', true], ['false', false],
      ['plain object', {}], ['empty array', []], ['string array', ['Ada']],
      ['boxed string', new String('Ada')], ['boxed empty string', new String('')],
      ['function', () => 'Ada'], ['symbol', Symbol('Ada')], ['bigint', 7n],
    ];
    for (const [label, name] of invalid) {
      assert.throws(() => greeting(name), TypeError, label);
    }
  });

  await t.test('AC-INVALID: reject objects before accessing trim or conversion hooks', () => {
    const accessed = [];
    const trap = (property) => {
      accessed.push(property);
      throw new Error(`unexpected access: ${String(property)}`);
    };
    const name = Object.freeze({
      get trim() { return trap('trim'); },
      get toString() { return trap('toString'); },
      get valueOf() { return trap('valueOf'); },
      get [Symbol.toPrimitive]() { return trap(Symbol.toPrimitive); },
    });
    assert.throws(() => greeting(name), TypeError);
    assert.deepEqual(accessed, [], 'type rejection must not consult input properties');
  });

  await t.test('AC-GREET / AC-INVALID: failures and repeated calls do not affect later results', () => {
    for (let repetition = 0; repetition < 3; repetition += 1) {
      assert.equal(greeting(' Ada '), 'Hello, Ada!');
      assert.throws(() => greeting(' \t\n'), TypeError);
      assert.equal(greeting('Grace'), 'Hello, Grace!');
      assert.throws(() => greeting(null), TypeError);
      assert.equal(greeting(' Ada '), 'Hello, Ada!');
    }
  });
});
