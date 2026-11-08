import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTarget } from './load-target.mjs';

// AC-ADD; requirement 3e34b31c-636e-493d-b022-313f3c684203.
// Authoring base: c107207dcfd976a2ab1b3972b8df8a5cc3285a9b.
// Coordinator command: node --test tests/add/behavior.test.mjs
const moduleUrl = new URL('../../src/add.mjs', import.meta.url);

test('AC-ADD: safe integer addition', async (t) => {
  const namespace = await loadTarget(moduleUrl, (message) => t.diagnostic(message));

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

// Closure input revision: 25d2f0d354ce663e67d845e4ba8c34b9fe586087.
// Following-stage command: node --test tests/add/behavior.test.mjs tests/multiply/behavior.test.mjs
// Injected classification tests do not constitute historical TDD Red evidence.
test('loader imports the exact target URL', async () => {
  const namespace = { marker: true };
  assert.equal(await loadTarget(moduleUrl, () => assert.fail('unexpected diagnostic'), async (url) => {
    assert.equal(url, moduleUrl.href);
    return namespace;
  }), namespace);
});

test('loader asserts only for the exact missing ESM target', async () => {
  const error = Object.assign(new Error('missing target'), { code: 'ERR_MODULE_NOT_FOUND', url: moduleUrl.href });
  await assert.rejects(loadTarget(moduleUrl, () => assert.fail('unexpected diagnostic'), async () => { throw error; }), (actual) => {
    assert.ok(actual instanceof assert.AssertionError);
    assert.ok(actual.message.includes(moduleUrl.href));
    return true;
  });
});

test('loader preserves and reports other import/environment failures', async (t) => {
  const cases = [
    ['transitive dependency', Object.assign(new Error('missing dependency'), { code: 'ERR_MODULE_NOT_FOUND', url: new URL('./dependency.mjs', moduleUrl).href })],
    ['similar URL', Object.assign(new Error('different target'), { code: 'ERR_MODULE_NOT_FOUND', url: moduleUrl.href + '.other' })],
    ['missing URL identity', Object.assign(new Error('Cannot find ' + moduleUrl.href), { code: 'ERR_MODULE_NOT_FOUND' })],
    ['CommonJS missing module', Object.assign(new Error('missing'), { code: 'MODULE_NOT_FOUND', url: moduleUrl.href })],
    ['syntax error', new SyntaxError('invalid syntax')],
    ['runtime initialization error', new Error('initialization failed')],
    ['environment error', Object.assign(new Error('permission denied'), { code: 'EACCES', url: moduleUrl.href })],
  ];
  for (const [label, error] of cases) {
    await t.test(label, async () => {
      const diagnostics = [];
      await assert.rejects(loadTarget(moduleUrl, (message) => diagnostics.push(message), async () => { throw error; }), (actual) => {
        assert.equal(actual, error);
        return true;
      });
      assert.deepEqual(diagnostics, ['IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red']);
    });
  }
});

// AC-ADD: input validation precedes arithmetic, including zero shortcuts.
test('add validates both inputs before arithmetic', async (t) => {
  const namespace = await loadTarget(moduleUrl, (message) => t.diagnostic(message));
  const operation = namespace.add;
  for (const invalid of ['2', NaN, Infinity, -Infinity, 1.5,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1, undefined, null]) {
    for (const valid of [0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]) {
      assert.throws(() => operation(invalid, valid), TypeError);
      assert.throws(() => operation(valid, invalid), TypeError);
    }
  }
  assert.throws(() => operation(), TypeError);
  assert.throws(() => operation(1), TypeError);
});
