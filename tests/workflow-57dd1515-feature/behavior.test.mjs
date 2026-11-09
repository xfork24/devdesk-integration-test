import test from 'node:test';
import assert from 'node:assert/strict';

const targetURL = new URL('../../src/workflow-57dd1515-greeting.mjs', import.meta.url).href;

async function loadGreeting(importer = (url) => import(url)) {
  try {
    return await importer(targetURL);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error.url === targetURL) {
      assert.fail(`Missing greeting implementation at ${targetURL}: ${error.stack ?? error}`);
    }
    throw error;
  }
}

test('loader converts only the exact missing target to an assertion', async () => {
  const missing = Object.assign(new Error('target absent'), {
    code: 'ERR_MODULE_NOT_FOUND', url: targetURL,
  });
  await assert.rejects(loadGreeting(async (url) => {
    assert.equal(url, targetURL);
    throw missing;
  }), (error) => {
    assert.equal(error.code, 'ERR_ASSERTION');
    assert.ok(error.message.includes(targetURL));
    assert.ok(error.message.includes(missing.stack));
    return true;
  });
});

test('loader preserves dependency, syntax, runtime and environment errors by identity', async () => {
  const failures = [
    Object.assign(new Error(`Dependency missing while importing ${targetURL}`), {
      code: 'ERR_MODULE_NOT_FOUND', url: new URL('./dependency.mjs', targetURL).href,
    }),
    Object.assign(new Error('package absent'), { code: 'ERR_MODULE_NOT_FOUND' }),
    Object.assign(new Error('different target URL'), {
      code: 'ERR_MODULE_NOT_FOUND', url: `${targetURL}?other`,
    }),
    Object.assign(new Error('path is not exact URL identity'), {
      code: 'ERR_MODULE_NOT_FOUND', url: new URL(targetURL).pathname,
    }),
    Object.assign(new SyntaxError('invalid module syntax'), { url: targetURL }),
    new TypeError('module initialization failed'),
    Object.assign(new Error('access denied'), { code: 'EACCES', url: targetURL }),
    Object.assign(new Error('unsupported import'), {
      code: 'ERR_UNKNOWN_FILE_EXTENSION', url: targetURL,
    }),
  ];
  for (const failure of failures) {
    await assert.rejects(loadGreeting(async () => { throw failure; }),
      (error) => error === failure);
  }
  const namespace = { greeting() {} };
  assert.equal(await loadGreeting(async (url) => {
    assert.equal(url, targetURL);
    return namespace;
  }), namespace);
});

test('independent feature acceptance: greeting', async (t) => {
  const namespace = await loadGreeting();
  assert.equal(typeof namespace.greeting, 'function', 'greeting must be a named function export');
  const greet = namespace.greeting;

  await t.test('AC-GREET: exact greeting, boundary trimming, case and internal whitespace', () => {
    assert.equal(greet('Ada'), 'Hello, Ada!');
    assert.equal(greet('  Ada  '), 'Hello, Ada!');
    assert.equal(greet('\t\nAda\r\n'), 'Hello, Ada!');
    assert.equal(greet('  aDa  Lovelace  '), 'Hello, aDa  Lovelace!');
    assert.equal(greet('\u00a0\u2003Ada\u202f\ufeff'), 'Hello, Ada!');
    assert.equal(greet(' A\tB\nC '), 'Hello, A\tB\nC!');
  });

  await t.test('AC-INVALID: empty and whitespace-only strings', () => {
    for (const blank of ['', ' ', '   ', '\t', '\n', '\r\n\t ', '\u00a0\u2003\u202f\ufeff']) {
      assert.throws(() => greet(blank), TypeError);
    }
  });

  await t.test('AC-INVALID: non-string inputs', () => {
    for (const invalid of [undefined, null, true, false, 0, 42, -1, NaN, Infinity,
      0n, Symbol('name'), [], ['Ada'], {}, { name: 'Ada' },
      function name() {}, new String('Ada'), new String('')]) {
      assert.throws(() => greet(invalid), TypeError);
    }
    assert.throws(() => greet(), TypeError);
  });

  await t.test('AC-INVALID: rejects before coercion', () => {
    let calls = 0;
    const sentinel = new Error('unexpected coercion');
    const hook = () => { calls += 1; throw sentinel; };
    assert.throws(() => greet({
      [Symbol.toPrimitive]: hook, toString: hook, valueOf: hook,
    }), TypeError);
    assert.equal(calls, 0);
  });
});
