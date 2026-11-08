import test from 'node:test';
import assert from 'node:assert/strict';

async function loadGreeting() {
  try {
    return await import('../../src/workflow-c25565aa-greeting.mjs');
  } catch (error) {
    assert.fail(`Unable to import greeting module: ${error.message}`);
  }
}

test('AC-GREET: exports greeting and trims surrounding whitespace', async () => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function');
  assert.equal(greeting('Ada'), 'Hello, Ada!');
  assert.equal(greeting('  Ada  '), 'Hello, Ada!');
  assert.equal(greeting('\tAda\n'), 'Hello, Ada!');
  assert.equal(greeting(' \tAda\n '), 'Hello, Ada!');
  assert.equal(greeting('  Ada  Lovelace  '), 'Hello, Ada  Lovelace!');
});

test('AC-INVALID: rejects omitted and non-string inputs with TypeError', async () => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function');
  assert.throws(() => greeting(), TypeError, 'omitted input');
  const invalidInputs = [
    ['undefined', undefined],
    ['null', null],
    ['true', true],
    ['false', false],
    ['zero', 0],
    ['number', 42],
    ['NaN', NaN],
    ['object', {}],
    ['array', []],
    ['symbol', Symbol('name')],
    ['bigint', 1n],
    ['boxed string', new String('Ada')],
  ];
  for (const [label, input] of invalidInputs) {
    assert.throws(() => greeting(input), TypeError, label);
  }
});

test('AC-INVALID: rejects empty and whitespace-only strings with TypeError', async () => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function');
  for (const input of ['', ' ', '\t', '\n', ' \t\r\n ']) {
    assert.throws(() => greeting(input), TypeError, JSON.stringify(input));
  }
});
