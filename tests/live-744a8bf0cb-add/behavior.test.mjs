import test from 'node:test';
import assert from 'node:assert/strict';

// Closure input revision: e153941b0aff4c16e291e2f920aea4445aa04d8b.
// Coordinator recipe: node --test tests/live-744a8bf0cb-add/behavior.test.mjs
const MODULE_URL = new URL('../../src/live-744a8bf0cb-add.mjs', import.meta.url).href;

// Invoked inside tests only; non-target errors retain their original identity.
async function loadModule(t, importer = (url) => import(url)) {
  try {
    return await importer(MODULE_URL);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error?.url === MODULE_URL) {
      assert.fail('Target implementation is missing: ' + MODULE_URL);
    }
    t.diagnostic('IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red');
    throw error;
  }
}

test('add loader classifies only the exact missing target as an assertion', async (t) => {
  const targetError = Object.assign(new Error('missing target'), {
    code: 'ERR_MODULE_NOT_FOUND', url: MODULE_URL,
  });
  await assert.rejects(
    () => loadModule(t, async (url) => {
      assert.equal(url, MODULE_URL);
      throw targetError;
    }),
    (error) => error instanceof assert.AssertionError &&
      error.code === 'ERR_ASSERTION' &&
      error.message === 'Target implementation is missing: ' + MODULE_URL
  );
  const environmentErrors = [
    Object.assign(new Error('missing transitive dependency'), {
      code: 'ERR_MODULE_NOT_FOUND', url: new URL('./dependency.mjs', MODULE_URL).href,
    }),
    Object.assign(new Error('target appears only in message: ' + MODULE_URL), {
      code: 'ERR_MODULE_NOT_FOUND',
    }),
    Object.assign(new Error('different URL identity'), {
      code: 'ERR_MODULE_NOT_FOUND', url: MODULE_URL + '?other',
    }),
    Object.assign(new Error('wrong error code'), { code: 'EACCES', url: MODULE_URL }),
    new SyntaxError('invalid module syntax'),
    new Error('module evaluation failed'),
    new TypeError('module evaluation type error'),
  ];
  for (const original of environmentErrors) {
    const diagnostics = [];
    await assert.rejects(
      () => loadModule({ diagnostic: (message) => diagnostics.push(message) }, async () => {
        throw original;
      }),
      (error) => error === original
    );
    assert.deepEqual(diagnostics, ['IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red']);
  }
  const namespace = { add: () => undefined };
  assert.equal(await loadModule(t, async (url) => {
    assert.equal(url, MODULE_URL);
    return namespace;
  }), namespace);
});

test('AC-ADD: named add export satisfies safe-integer arithmetic', async (t) => {
  const arithmetic = await loadModule(t);

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
