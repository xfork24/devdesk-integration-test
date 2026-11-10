import test from 'node:test';
import assert from 'node:assert/strict';

// Independent Feature coverage of the public ESM interface; no Task test imports.
// Run with the Task file using node --test; timeout: 60 seconds.
// No fixtures, installation, network, or cleanup are required.
test('Feature greeting public contract', async (t) => {
  let api;
  const target = new URL('../../src/workflow-v4-10f1735d/greeting.mjs', import.meta.url);
  try {
    api = await import(target.href);
  } catch (error) {
    const absent = error?.code === 'ERR_MODULE_NOT_FOUND' && error?.url === target.href;
    assert.fail(absent
      ? 'Missing Feature implementation (assertion failure)'
      : `Module loading error; not an expected missing-implementation Red: ${error?.stack ?? error}`);
  }
  assert.equal(typeof api.greeting, 'function', 'public named export greeting');
  const greet = api.greeting;

  await t.test('AC-GREET: caller receives exact primitive strings with content preserved', () => {
    const examples = [
      ['Ada', 'Hello, Ada!'],
      ['  Ada  ', 'Hello, Ada!'],
      ['\tAda\n', 'Hello, Ada!'],
      ['  Mary Jane  ', 'Hello, Mary Jane!'],
      ['\nA  B\tC\nD\r', 'Hello, A  B\tC\nD!'],
      [' Élodie 李 👩‍💻! ', 'Hello, Élodie 李 👩‍💻!!'],
      [' e\u0301 ', 'Hello, e\u0301!'],
      [' aDa ', 'Hello, aDa!'],
      [' \u200b\u0085 ', 'Hello, \u200b\u0085!'],
    ];
    for (const [input, expected] of examples) {
      const output = greet(input);
      assert.equal(typeof output, 'string', 'return synchronously, without boxing');
      assert.equal(output, expected, JSON.stringify(input));
    }
  });

  await t.test('AC-GREET / AC-INVALID: ECMAScript whitespace boundaries', () => {
    // Explicit trim whitespace set: each character is checked at both boundaries
    // and by itself. U+200B and U+0085 above must remain part of the name.
    const whitespace = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
    for (const edge of whitespace) {
      assert.equal(greet(`${edge}Lin`), 'Hello, Lin!');
      assert.equal(greet(`Lin${edge}`), 'Hello, Lin!');
      assert.throws(() => greet(edge), TypeError);
    }
    for (const empty of ['', '   ', '\t\n', whitespace]) {
      assert.throws(() => greet(empty), TypeError);
    }
  });

  await t.test('AC-INVALID: all non-string categories and omission fail synchronously', () => {
    const invalid = [
      undefined, null, 0, -1, NaN, Infinity, true, false,
      {}, [], ['Lin'], () => 'Lin', Symbol('Lin'), 3n, new String('Lin'),
    ];
    for (const value of invalid) {
      assert.throws(() => greet(value), TypeError);
    }
    assert.throws(() => greet(), TypeError);
  });

  await t.test('AC-INVALID: reject objects before accessing methods or coercing', () => {
    const accesses = [];
    const input = new Proxy({}, {
      get(_target, key) {
        accesses.push(key);
        throw new Error('input must not be inspected');
      },
    });
    assert.throws(() => greet(input), TypeError);
    assert.deepEqual(accesses, []);
  });

  await t.test('AC-GREET / AC-INVALID: caller can recover and repeat without shared state', () => {
    const name = '  Lin\n';
    for (const bad of [null, '', {}, '\t\n', new String('Lin')]) {
      assert.equal(greet(name), 'Hello, Lin!');
      assert.throws(() => greet(bad), TypeError);
      assert.equal(greet('  Kai  '), 'Hello, Kai!');
      assert.equal(greet(name), 'Hello, Lin!');
      assert.equal(name, '  Lin\n', 'caller input remains unchanged');
    }
  });
});
