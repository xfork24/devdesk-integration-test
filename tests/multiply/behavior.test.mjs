import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTarget } from './load-target.mjs';

// AC-MUL; requirement 3e34b31c-636e-493d-b022-313f3c684203.
const moduleUrl = new URL('../../src/multiply.mjs', import.meta.url);
async function loadMultiply(t) {
  const mod = await loadTarget(moduleUrl, (message) => t.diagnostic(message));
  return mod.multiply;
}

const INVALID_INPUTS = [
  ['string', '2'],
  ['NaN', NaN],
  ['positive Infinity', Infinity],
  ['negative Infinity', -Infinity],
  ['decimal', 2.5],
  ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ['negative unsafe integer', Number.MIN_SAFE_INTEGER - 1],
  ['negative fraction', -1.5],
  ['undefined', undefined],
  ['null', null],
  ['boolean', true],
  ['bigint', 2n],
  ['symbol', Symbol('integer')],
  ['boxed number', new Number(2)],
  ['coercible object', { valueOf() { throw new Error('must not coerce'); } }],
];

test('multiply module exports a multiply function', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(typeof multiply, 'function');
});

test('multiply(2,3) returns 6', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(2, 3), 6);
});

test('multiply supports zero operands', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(0, 5), 0);
  assert.equal(multiply(5, 0), 0);
  assert.equal(multiply(0, 0), 0);
});

test('multiply supports negative operands', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(-2, 3), -6);
  assert.equal(multiply(2, -3), -6);
  assert.equal(multiply(-2, -3), 6);
});

test('multiply returns safe results at safe-integer boundaries', async (t) => {
  const multiply = await loadMultiply(t);
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, 1), Number.MAX_SAFE_INTEGER);
  assert.equal(multiply(1, Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER);
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, 0), 0);
});

test('multiply rejects non-safe-integer inputs with TypeError in either position', async (t) => {
  const multiply = await loadMultiply(t);
  for (const [label, value] of INVALID_INPUTS) {
    assert.throws(() => multiply(value, 1), TypeError, `first argument ${label} must throw TypeError`);
    assert.throws(() => multiply(1, value), TypeError, `second argument ${label} must throw TypeError`);
  }
});

test('multiply throws RangeError when positive result overflows safe range', async (t) => {
  const multiply = await loadMultiply(t);
  assert.throws(() => multiply(Number.MAX_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => multiply(2, Number.MAX_SAFE_INTEGER), RangeError);
});

test('multiply throws RangeError when negative result overflows safe range', async (t) => {
  const multiply = await loadMultiply(t);
  assert.throws(() => multiply(-Number.MAX_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => multiply(2, -Number.MAX_SAFE_INTEGER), RangeError);
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

// AC-MUL: input validation precedes arithmetic, including zero shortcuts.
test('multiply validates both inputs before arithmetic', async (t) => {
  const namespace = await loadTarget(moduleUrl, (message) => t.diagnostic(message));
  const operation = namespace.multiply;
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
