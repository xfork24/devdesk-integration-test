import test from 'node:test';
import assert from 'node:assert/strict';

// AC-ADD; execution and revision evidence are recorded by the coordinator.
const moduleUrl = new URL('../../src/live-22459b4106-add.mjs', import.meta.url);

async function loadAdd() {
  let module;
  try {
    module = await import(moduleUrl.href);
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === moduleUrl.href) {
      assert.fail('AC-ADD: required module src/live-22459b4106-add.mjs is missing');
    }
    throw error; // Import/environment failures are not expected assertion Red.
  }
  assert.equal(typeof module.add, 'function', 'AC-ADD requires named export add');
  return module.add;
}

test('AC-ADD: ordinary sums, zero, negatives, and safe boundaries', async () => {
  const add = await loadAdd();
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

test('AC-ADD: invalid inputs in either position throw TypeError without coercion', async () => {
  const add = await loadAdd();
  const invalid = ['2', '', NaN, Infinity, -Infinity, 1.5, -1.5,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1,
    undefined, null, true, false, 2n, {}, [], Symbol('integer')];
  for (const value of invalid) {
    assert.throws(() => add(value, 1), TypeError);
    assert.throws(() => add(1, value), TypeError);
  }
});

test('AC-ADD: safe inputs with positive or negative overflow throw RangeError', async () => {
  const add = await loadAdd();
  const max = Number.MAX_SAFE_INTEGER;
  const min = Number.MIN_SAFE_INTEGER;
  for (const [a, b] of [[max, 1], [1, max], [min, -1], [-1, min],
    [max, max], [min, min]]) {
    assert.throws(() => add(a, b), RangeError, `add(${a}, ${b})`);
  }
});
