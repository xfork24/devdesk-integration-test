import test from 'node:test';
import assert from 'node:assert/strict';

test('greeting Task: AC-GREET and AC-INVALID', async (t) => {
  let target;
  try {
    target = await import('../../src/workflow-v4-a8003835/greeting.mjs');
  } catch (error) {
    assert.fail(`Target import failed (${error.code ?? error.name}): ${error.message}`);
  }
  assert.equal(typeof target.greeting, 'function', 'ESM named export greeting');
  const { greeting } = target;

  await t.test('AC-GREET: exact synchronous results and trim boundaries', () => {
    const examples = [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\tAda\n', 'Hello, Ada!'],
      ['Ada Lovelace', 'Hello, Ada Lovelace!'],
      ['  aDa  LoveLace  ', 'Hello, aDa  LoveLace!'],
      ['\u00a0\uFEFFAda\u2003', 'Hello, Ada!'],
      [' A\tB\nC ', 'Hello, A\tB\nC!'],
      [' 李雷 ', 'Hello, 李雷!'],
    ];
    for (const [name, expected] of examples) {
      assert.equal(greeting(name), expected, JSON.stringify(name));
    }
  });

  await t.test('AC-INVALID: empty or whitespace-only strings throw TypeError', () => {
    for (const name of ['', ' ', '   ', '\t', '\n', '\r\n\t ', '\u00a0\uFEFF\u2003']) {
      assert.throws(() => greeting(name), TypeError, JSON.stringify(name));
    }
  });

  await t.test('AC-INVALID: reject every non-string category without coercion', () => {
    assert.throws(() => greeting(), TypeError, 'omitted argument');
    for (const name of [undefined, null, 0, 42, NaN, Infinity, true, false,
      {}, [], ['Ada'], new String('Ada'), Symbol('Ada'), 1n, () => 'Ada']) {
      assert.throws(() => greeting(name), TypeError);
    }
    let conversions = 0;
    const object = {
      [Symbol.toPrimitive]() { conversions += 1; return 'Ada'; },
      toString() { conversions += 1; return 'Ada'; },
      trim() { conversions += 1; return 'Ada'; },
    };
    assert.throws(() => greeting(object), TypeError);
    assert.equal(conversions, 0, 'non-string hooks must never run');
  });

  await t.test('AC-GREET/AC-INVALID: deterministic calls recover after rejection', () => {
    for (let i = 0; i < 3; i += 1) {
      assert.equal(greeting(' Ada '), 'Hello, Ada!');
      assert.throws(() => greeting(null), TypeError);
      assert.equal(greeting('Grace'), 'Hello, Grace!');
      assert.throws(() => greeting(' \t '), TypeError);
      assert.equal(greeting(' Ada '), 'Hello, Ada!');
    }
  });
});
