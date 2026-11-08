import test from 'node:test';
import assert from 'node:assert/strict';

// AC-MUL: multiply 返回安全整数之积；支持零和负数；不允许隐式类型转换；
// 任一输入不满足 Number.isSafeInteger 时抛 TypeError；结果超出安全整数范围时抛 RangeError。
const MODULE_URL = new URL('../../src/live-744a8bf0cb-multiply.mjs', import.meta.url).href;

function isMissingTargetModule(error) {
  return (
    error instanceof Error &&
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.url === MODULE_URL
  );
}

// 在测试回调内执行动态导入；仅在确认缺少目标模块（ERR_MODULE_NOT_FOUND 且
// error.url 精确指向目标模块）时用 assert.fail 形成预期 Red。其他导入错误、
// 语法错误、启动失败与环境错误一律原样抛出，不得改判为有效 Red。
async function loadMultiply(t) {
  let mod;
  try {
    mod = await import(MODULE_URL);
  } catch (error) {
    if (isMissingTargetModule(error)) {
      assert.fail(`Target implementation is missing: ${MODULE_URL}`);
    }
    t.diagnostic(`IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red (${error?.message})`);
    throw error;
  }
  assert.equal(
    typeof mod.multiply,
    'function',
    `multiply must be a named function export from ${MODULE_URL}`
  );
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
