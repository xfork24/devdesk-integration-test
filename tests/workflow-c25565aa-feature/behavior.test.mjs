import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGreeting, targetURL } from './load-target.mjs';

test('AC-GREET: named export and exact greetings', async () => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function');
  assert.equal(greeting('Ada'), 'Hello, Ada!');
  assert.equal(greeting('  Ada  '), 'Hello, Ada!');
  assert.equal(greeting('\tAda\n'), 'Hello, Ada!');
  assert.equal(greeting(' \tAda\n '), 'Hello, Ada!');
  assert.equal(greeting('  Ada  Lovelace  '), 'Hello, Ada  Lovelace!');
});

test('AC-INVALID: omitted and non-string input throws TypeError', async () => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function');
  assert.throws(() => greeting(), TypeError, 'omitted');
  for (const value of [undefined, null, true, false, 0, 42, NaN, {}, [], Symbol('name'), 1n, new String('Ada')]) {
    assert.throws(() => greeting(value), TypeError);
  }
});

test('AC-INVALID: empty and whitespace-only input throws TypeError', async () => {
  const { greeting } = await loadGreeting();
  assert.equal(typeof greeting, 'function');
  for (const value of ['', ' ', '\t', '\n', ' \t\r\n ']) {
    assert.throws(() => greeting(value), TypeError, JSON.stringify(value));
  }
});

test('loader: imports the exact target URL and returns its namespace', async () => {
  assert.equal(targetURL, new URL('../../src/workflow-c25565aa-greeting.mjs', import.meta.url).href);
  const namespace = { greeting() {} };
  const result = await loadGreeting(async (url) => {
    assert.equal(url, targetURL);
    return namespace;
  });
  assert.equal(result, namespace);
});

test('loader: only a missing exact target becomes an assertion failure', async () => {
  const missing = Object.assign(new Error('missing target'), {
    code: 'ERR_MODULE_NOT_FOUND', url: targetURL,
  });
  await assert.rejects(loadGreeting(async () => { throw missing; }), (error) => {
    assert.ok(error instanceof assert.AssertionError);
    assert.equal(error.code, 'ERR_ASSERTION');
    assert.equal(error.message, `Greeting implementation is missing: ${targetURL}`);
    return true;
  });
});

test('loader: dependency, syntax, runtime and environment errors retain identity', async () => {
  const failures = [
    Object.assign(new Error('transitive dependency missing'), {
      code: 'ERR_MODULE_NOT_FOUND', url: new URL('../../src/dependency.mjs', import.meta.url).href,
    }),
    Object.assign(new Error('similar target URL'), { code: 'ERR_MODULE_NOT_FOUND', url: `${targetURL}?other` }),
    Object.assign(new Error('missing identity'), { code: 'ERR_MODULE_NOT_FOUND' }),
    Object.assign(new Error('wrong error code'), { code: 'ERR_UNSUPPORTED_DIR_IMPORT', url: targetURL }),
    new SyntaxError('invalid module syntax'),
    new TypeError('module evaluation failed'),
    Object.assign(new Error('access denied'), { code: 'EACCES', url: targetURL }),
  ];
  for (const failure of failures) {
    await assert.rejects(loadGreeting(async () => { throw failure; }), (error) => {
      assert.equal(error, failure);
      return true;
    });
  }
});
