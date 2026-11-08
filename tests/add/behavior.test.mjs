import test from 'node:test';
import assert from 'node:assert/strict';

// AC-ADD; requirement 3e34b31c-636e-493d-b022-313f3c684203.
// Authoring base: c107207dcfd976a2ab1b3972b8df8a5cc3285a9b.
// Coordinator command: node --test tests/add/behavior.test.mjs
const moduleUrl = new URL('../../src/add.mjs', import.meta.url);

test('AC-ADD: safe integer addition', async (t) => {
  let namespace;
  try {
    namespace = await import(moduleUrl.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error.url === moduleUrl.href) {
      assert.fail('AC-ADD: target implementation src/add.mjs is missing');
    }
    t.diagnostic('IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red');
    throw error;
  }

  const { add } = namespace;
  assert.equal(typeof add, 'function', 'src/add.mjs must export named function add');

  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;
  const validCases = [
    [2, 3, 5],
    [-2, -3, -5],
    [-2, 3, 1],
    [2, -3, -1],
    [0, 0, 0],
    [0, 7, 7],
    [7, 0, 7],
    [0, -7, -7],
    [-7, 0, -7],
    [max, 0, max],
    [min, 0, min],
    [max - 1, 1, max],
    [min + 1, -1, min],
    [max, -1, max - 1],
    [min, 1, min + 1],
    [max, min, 0],
  ];

  for (const [a, b, expected] of validCases) {
    await t.test(`add(${a}, ${b}) returns ${expected}`, () => {
      assert.equal(add(a, b), expected);
    });
  }

  const invalidCases = [
    ['numeric string', '2'],
    ['NaN', NaN],
    ['positive infinity', Infinity],
    ['negative infinity', -Infinity],
    ['positive fraction', 1.5],
    ['negative fraction', -1.5],
    ['above safe maximum', max + 1],
    ['below safe minimum', min - 1],
    ['undefined', undefined],
    ['null', null],
    ['boolean', true],
    ['bigint', 2n],
    ['symbol', Symbol('integer')],
    ['boxed number', new Number(2)],
    ['coercible object', { valueOf() { throw new Error('must not coerce'); } }],
  ];

  for (const [label, invalid] of invalidCases) {
    await t.test(`rejects ${label} in either argument with TypeError`, () => {
      assert.throws(() => add(invalid, 1), TypeError);
      assert.throws(() => add(1, invalid), TypeError);
    });
  }

  for (const [a, b] of [[max, 1], [1, max], [min, -1], [-1, min], [max, max], [min, min]]) {
    await t.test(`add(${a}, ${b}) rejects overflow with RangeError`, () => {
      assert.throws(() => add(a, b), RangeError);
    });
  }
});
