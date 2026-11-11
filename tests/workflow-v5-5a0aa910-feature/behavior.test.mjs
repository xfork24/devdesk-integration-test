import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../../src/workflow-v5-5a0aa910/greeting.mjs';

// Feature c411977c-85ea-48fd-8926-960c186045a0; sole Task: greeting.
// Public caller scenarios supplement the preserved Task contract tests.
// Run both files with node --test; Node built-ins only, timeout 60 seconds.
// No fixtures, external services, persistent state, or cleanup are needed.
// Static import leaves module/export errors as prerequisite failures, not business Red.
// This suite does not establish historical TDD, platform execution, or release approval.

test('AC-GREET: caller receives exact synchronous greetings without changing name content', () => {
  const cases = [
    ['Alice', 'Hello, Alice!'],
    [' \tAlice\r\n', 'Hello, Alice!'],
    ['\uFEFF\u00A0Ada  Lovelace\u3000', 'Hello, Ada  Lovelace!'],
    ['  李\t小\n龍 👋  ', 'Hello, 李\t小\n龍 👋!'],
    [' e\u0301 ', 'Hello, e\u0301!'],
    [' É ', 'Hello, É!'],
    [' \u200B ', 'Hello, \u200B!'],
    [' \u0085 ', 'Hello, \u0085!'],
    [' ! ', 'Hello, !!'],
  ];
  for (const [name, expected] of cases) {
    const result = greeting(name);
    assert.equal(typeof result, 'string');
    assert.equal(result, expected, JSON.stringify(name));
  }
});

test('AC-INVALID / AC-GREET: caller catches each rejection and can immediately retry', () => {
  const invalid = [
    '', ' \t\r\n', '\uFEFF\u00A0\u1680\u2003\u2028\u2029\u202F\u205F\u3000',
    undefined, null, false, true, 0, -1, NaN, Infinity, 0n,
    Symbol('Alice'), {}, [], ['Alice'], new String('Alice'), () => 'Alice',
  ];
  assert.throws(() => greeting(), TypeError);
  assert.equal(greeting('  Bob  '), 'Hello, Bob!');
  for (const name of invalid) {
    // throws requires a synchronous exception and deliberately ignores message text.
    assert.throws(() => greeting(name), TypeError);
    assert.equal(greeting('  Alice  '), 'Hello, Alice!');
  }
});

test('AC-INVALID: rejected caller objects have no conversion or property-access side effects', () => {
  const touched = [];
  const object = {
    [Symbol.toPrimitive]() { touched.push('toPrimitive'); return 'Alice'; },
    toString() { touched.push('toString'); return 'Alice'; },
    valueOf() { touched.push('valueOf'); return 'Alice'; },
    get trim() { touched.push('trim'); return () => 'Alice'; },
  };
  const proxy = new Proxy(object, {
    get(target, key, receiver) {
      touched.push(key);
      return Reflect.get(target, key, receiver);
    },
  });
  for (const input of [object, proxy]) {
    assert.throws(() => greeting(input), TypeError);
    assert.deepEqual(touched, []);
    assert.equal(greeting('Grace'), 'Hello, Grace!');
  }
});

test('AC-GREET / AC-INVALID: interleaved callers stay independent across repeated failures', () => {
  const names = Object.freeze(['  Alice  ', '\tBob\n', ' Ada  Lovelace ']);
  const expected = ['Hello, Alice!', 'Hello, Bob!', 'Hello, Ada  Lovelace!'];
  for (let round = 0; round < 3; round += 1) {
    assert.deepEqual(names.map(name => greeting(name)), expected);
    assert.throws(() => greeting('  '), TypeError);
    assert.throws(() => greeting(null), TypeError);
    assert.deepEqual([...names].reverse().map(name => greeting(name)), [...expected].reverse());
  }
  assert.deepEqual(names, ['  Alice  ', '\tBob\n', ' Ada  Lovelace ']);
});
