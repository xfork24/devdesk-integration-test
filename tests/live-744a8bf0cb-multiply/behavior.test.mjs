import test from 'node:test';
import assert from 'node:assert/strict';

// Closure input revision: e153941b0aff4c16e291e2f920aea4445aa04d8b.
// Coordinator recipe: node --test tests/live-744a8bf0cb-multiply/behavior.test.mjs
const MODULE_URL = new URL('../../src/live-744a8bf0cb-multiply.mjs', import.meta.url).href;

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

test('multiply loader classifies only the exact missing target as an assertion', async (t) => {
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
  const namespace = { multiply: () => undefined };
  assert.equal(await loadModule(t, async (url) => {
    assert.equal(url, MODULE_URL);
    return namespace;
  }), namespace);
});

async function loadMultiply(t) {
  const mod = await loadModule(t);
  assert.equal(typeof mod.multiply, 'function', 'multiply must be a named function export from ' + MODULE_URL);
  return mod.multiply;
}

test('multiply is exported as a function', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(typeof multiply, 'function');
});

test('multiply(2, 3) returns 6', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(2, 3), 6);
});

test('multiply supports zero operands', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(0, 5), 0);
  assert.equal(multiply(5, 0), 0);
  assert.equal(multiply(0, 0), 0);
  assert.equal(multiply(0, -7), 0);
  assert.equal(multiply(-7, 0), 0);
});

test('multiply supports negative operands', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(-2, 3), -6);
  assert.equal(multiply(2, -3), -6);
  assert.equal(multiply(-2, -3), 6);
  assert.equal(multiply(-1, 5), -5);
});

test('multiply supports the multiplicative identity 1', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(5, 1), 5);
  assert.equal(multiply(1, 5), 5);
  assert.equal(multiply(1, -5), -5);
});

test('multiply returns safe results at safe-integer boundaries', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, 1), Number.MAX_SAFE_INTEGER);
  assert.equal(multiply(1, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  assert.equal(multiply(Number.MIN_SAFE_INTEGER, 1), Number.MIN_SAFE_INTEGER);
  assert.equal(multiply(1, Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER);
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, -1), Number.MIN_SAFE_INTEGER);
  assert.equal(multiply(Number.MIN_SAFE_INTEGER, -1), Number.MAX_SAFE_INTEGER);
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, 0), 0);
  assert.equal(multiply(Number.MIN_SAFE_INTEGER, 0), 0);
});

test('multiply throws RangeError when the product exceeds the safe range (positive)', async (t) => {
  const multiply = await loadMultiply(t);
  assert.throws(() => multiply(Number.MAX_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => multiply(2, Number.MAX_SAFE_INTEGER), RangeError);
  assert.throws(() => multiply(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), RangeError);
  assert.throws(() => multiply(Number.MIN_SAFE_INTEGER, -2), RangeError);
  assert.throws(() => multiply(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER), RangeError);
});

test('multiply throws RangeError when the product falls below the safe range (negative)', async (t) => {
  const multiply = await loadMultiply(t);
  assert.throws(() => multiply(Number.MIN_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => multiply(2, Number.MIN_SAFE_INTEGER), RangeError);
  assert.throws(() => multiply(Number.MAX_SAFE_INTEGER, -2), RangeError);
  assert.throws(() => multiply(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), RangeError);
});

test('multiply throws TypeError for non-safe-integer inputs (no implicit conversion)', async (t) => {
  const multiply = await loadMultiply(t);
  const invalidInputs = [
    ['string number "2"', '2'],
    ['string "abc"', 'abc'],
    ['NaN', NaN],
    ['positive Infinity', Infinity],
    ['negative Infinity', -Infinity],
    ['decimal 1.5', 1.5],
    ['decimal 0.1', 0.1],
    ['negative fraction -1.5', -1.5],
    ['unsafe integer MAX_SAFE_INTEGER + 1', Number.MAX_SAFE_INTEGER + 1],
    ['unsafe integer MIN_SAFE_INTEGER - 1', Number.MIN_SAFE_INTEGER - 1],
    ['undefined', undefined],
    ['null', null],
    ['boolean true', true],
    ['bigint 2n', 2n],
    ['symbol', Symbol('integer')],
    ['boxed number', new Number(2)],
    ['object {}', {}],
    ['array []', []],
    ['coercible object', { valueOf() { throw new Error('must not coerce'); } }],
  ];
  for (const [label, value] of invalidInputs) {
    assert.throws(() => multiply(value, 2), TypeError, `first argument must reject ${label}`);
    assert.throws(() => multiply(2, value), TypeError, `second argument must reject ${label}`);
  }
});
