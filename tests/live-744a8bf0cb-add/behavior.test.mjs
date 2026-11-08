import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';

// AC-ADD; frozen input revision: ee4785bd579f13c9479800a64ad53bfa83f04f5d.
// Coordinator recipe: node --test tests/live-744a8bf0cb-add/behavior.test.mjs
test('AC-ADD: named add export satisfies safe-integer arithmetic', async (t) => {
  const moduleURL = new URL('../../src/live-744a8bf0cb-add.mjs', import.meta.url);
  let arithmetic;
  try {
    arithmetic = await import('../../src/live-744a8bf0cb-add.mjs');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      let missing = false;
      try {
        await access(moduleURL);
      } catch (accessError) {
        if (accessError.code === 'ENOENT') missing = true;
        else throw new Error('Environment failure checking the add module', { cause: accessError });
      }
      if (missing) assert.fail('AC-ADD: required src/live-744a8bf0cb-add.mjs is missing');
    }
    throw new Error('Import/environment failure; this is not a valid assertion Red', { cause: error });
  }

  assert.equal(typeof arithmetic.add, 'function', 'module must export named function add');
  const { add } = arithmetic;
  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;

  await t.test('basic sums, negative operands, zero, and cancellation', () => {
    for (const [a, b, expected] of [
      [2, 3, 5], [0, 0, 0], [0, 7, 7], [7, 0, 7],
      [-2, -3, -5], [-2, 3, 1], [2, -3, -1], [-7, 0, -7],
      [0, -7, -7], [7, -7, 0],
    ]) {
      assert.equal(add(a, b), expected, `add(${a}, ${b})`);
    }
  });

  await t.test('safe-integer boundaries remain valid', () => {
    for (const [a, b, expected] of [
      [max, 0, max], [0, max, max], [min, 0, min], [0, min, min],
      [max - 1, 1, max], [min + 1, -1, min],
      [max, -1, max - 1], [min, 1, min + 1], [max, min, 0],
    ]) {
      assert.equal(add(a, b), expected, `add(${a}, ${b})`);
    }
  });

  const invalidInputs = [
    ['numeric string', '2'], ['NaN', NaN], ['Infinity', Infinity],
    ['negative Infinity', -Infinity], ['fraction', 1.5], ['negative fraction', -1.5],
    ['unsafe positive integer', max + 1], ['unsafe negative integer', min - 1],
    ['undefined', undefined], ['null', null], ['boolean', true],
    ['bigint', 2n], ['symbol', Symbol('2')], ['array', [2]],
    ['boxed number', new Number(2)],
    ['coercible object', { valueOf() { throw new Error('must not coerce'); } }],
  ];
  for (const [label, invalid] of invalidInputs) {
    await t.test(`rejects ${label} in either position with TypeError`, () => {
      assert.throws(() => add(invalid, 0), TypeError);
      assert.throws(() => add(0, invalid), TypeError);
      assert.throws(() => add(invalid, invalid), TypeError);
    });
  }

  await t.test('missing arguments throw TypeError', () => {
    assert.throws(() => add(), TypeError);
    assert.throws(() => add(1), TypeError);
  });

  await t.test('positive and negative result overflow throws RangeError', () => {
    for (const [a, b] of [
      [max, 1], [1, max], [min, -1], [-1, min], [max, max], [min, min],
    ]) {
      assert.throws(() => add(a, b), RangeError, `add(${a}, ${b})`);
    }
  });
});
