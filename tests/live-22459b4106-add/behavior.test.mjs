import test from 'node:test';
import assert from 'node:assert/strict';

// AC-ADD; execution and revision evidence are recorded by the coordinator.
const moduleUrl = new URL('../../src/live-22459b4106-add.mjs', import.meta.url);

async function loadModule(t, importer = (url) => import(url)) {
  try {
    return await importer(moduleUrl.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error?.url === moduleUrl.href) {
      assert.fail('Target implementation is missing: ' + moduleUrl.href);
    }
    t.diagnostic('IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red');
    throw error;
  }
}

async function loadAdd(t) {
  const mod = await loadModule(t);
  assert.equal(
    typeof mod.add,
    'function',
    'add must be a named function export from ' + moduleUrl.href
  );
  return mod.add;
}

test('AC-ADD: ordinary sums, zero, negatives, and safe boundaries', async (t) => {
  const add = await loadAdd(t);
  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;
  for (const [a, b, expected] of [
    [2, 3, 5], [0, 0, 0], [0, 7, 7], [7, 0, 7],
    [-2, -3, -5], [-2, 3, 1], [3, -2, 1], [-7, 7, 0],
    [max, 0, max], [0, min, min], [max - 1, 1, max],
    [min + 1, -1, min], [max, min, 0], [min, max, 0],
  ]) {
    assert.equal(add(a, b), expected, `add(${a}, ${b})`);
  }
});

test('AC-ADD: invalid inputs in either position throw TypeError without coercion', async (t) => {
  const add = await loadAdd(t);
  const invalid = ['2', '', NaN, Infinity, -Infinity, 1.5, -1.5,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1,
    undefined, null, true, false, 2n, {}, [], Symbol('integer')];
  for (const value of invalid) {
    assert.throws(() => add(value, 1), TypeError);
    assert.throws(() => add(1, value), TypeError);
  }
});

test('AC-ADD: safe inputs with positive or negative overflow throw RangeError', async (t) => {
  const add = await loadAdd(t);
  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;
  for (const [a, b] of [[max, 1], [1, max], [min, -1], [-1, min],
    [max, max], [min, min]]) {
    assert.throws(() => add(a, b), RangeError, `add(${a}, ${b})`);
  }
});

test('add loader treats only the exact missing target as an assertion', async (t) => {
  const targetError = Object.assign(new Error('missing target'), {
    code: 'ERR_MODULE_NOT_FOUND',
    url: moduleUrl.href,
  });
  await assert.rejects(
    () => loadModule(t, async (url) => {
      assert.equal(url, moduleUrl.href);
      throw targetError;
    }),
    (error) => error instanceof assert.AssertionError &&
      error.code === 'ERR_ASSERTION' &&
      error.message === 'Target implementation is missing: ' + moduleUrl.href
  );

  const environmentErrors = [
    Object.assign(new Error('missing transitive dependency'), {
      code: 'ERR_MODULE_NOT_FOUND',
      url: new URL('./dependency.mjs', moduleUrl.href).href,
    }),
    Object.assign(new Error('target appears only in message: ' + moduleUrl.href), {
      code: 'ERR_MODULE_NOT_FOUND',
    }),
    Object.assign(new Error('different URL identity'), {
      code: 'ERR_MODULE_NOT_FOUND',
      url: moduleUrl.href + '?other',
    }),
    Object.assign(new Error('wrong error code'), { code: 'EACCES', url: moduleUrl.href }),
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
    assert.equal(url, moduleUrl.href);
    return namespace;
  }), namespace);
});

test('AC-ADD: validates both inputs before arithmetic without coercion', async (t) => {
  const add = await loadAdd(t);
  const invalid = [new Number(2), { valueOf() { throw new Error('must not coerce'); } }];
  for (const value of invalid) {
    assert.throws(() => add(value, 0), TypeError);
    assert.throws(() => add(0, value), TypeError);
  }
  assert.throws(() => add(), TypeError);
  assert.throws(() => add(1), TypeError);
});
