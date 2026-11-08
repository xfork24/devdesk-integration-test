import test from 'node:test';
import assert from 'node:assert/strict';

const MODULE_PATH = '../../src/multiply.mjs';

async function loadMultiply() {
  try {
    const mod = await import(MODULE_PATH);
    return mod.multiply;
  } catch (err) {
    const code = err && err.code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      assert.fail(`multiply module is missing (${MODULE_PATH}): ${err.message}`);
    }
    throw err;
  }
}

const INVALID_INPUTS = [
  ['string', '2'],
  ['NaN', NaN],
  ['positive Infinity', Infinity],
  ['negative Infinity', -Infinity],
  ['decimal', 2.5],
  ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
];

test('multiply module exports a multiply function', async () => {
  const multiply = await loadMultiply();
  assert.equal(typeof multiply, 'function');
});

test('multiply(2,3) returns 6', async () => {
  const multiply = await loadMultiply();
  assert.equal(multiply(2, 3), 6);
});

test('multiply supports zero operands', async () => {
  const multiply = await loadMultiply();
  assert.equal(multiply(0, 5), 0);
  assert.equal(multiply(5, 0), 0);
  assert.equal(multiply(0, 0), 0);
});

test('multiply supports negative operands', async () => {
  const multiply = await loadMultiply();
  assert.equal(multiply(-2, 3), -6);
  assert.equal(multiply(2, -3), -6);
  assert.equal(multiply(-2, -3), 6);
});

test('multiply returns safe results at safe-integer boundaries', async () => {
  const multiply = await loadMultiply();
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, 1), Number.MAX_SAFE_INTEGER);
  assert.equal(multiply(1, Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER);
  assert.equal(multiply(Number.MAX_SAFE_INTEGER, 0), 0);
});

test('multiply rejects non-safe-integer inputs with TypeError in either position', async () => {
  const multiply = await loadMultiply();
  for (const [label, value] of INVALID_INPUTS) {
    assert.throws(() => multiply(value, 1), TypeError, `first argument ${label} must throw TypeError`);
    assert.throws(() => multiply(1, value), TypeError, `second argument ${label} must throw TypeError`);
  }
});

test('multiply throws RangeError when positive result overflows safe range', async () => {
  const multiply = await loadMultiply();
  assert.throws(() => multiply(Number.MAX_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => multiply(2, Number.MAX_SAFE_INTEGER), RangeError);
});

test('multiply throws RangeError when negative result overflows safe range', async () => {
  const multiply = await loadMultiply();
  assert.throws(() => multiply(-Number.MAX_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => multiply(2, -Number.MAX_SAFE_INTEGER), RangeError);
});
