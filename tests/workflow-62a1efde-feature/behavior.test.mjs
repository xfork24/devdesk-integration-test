import test from 'node:test';
import assert from 'node:assert/strict';

const targetURL = new URL('../../src/workflow-62a1efde-greeting.mjs', import.meta.url);

// Only a missing entry module is an assertion Red. Preserve all other loader
// errors unchanged so dependency, syntax and environment failures stay distinct.
async function loadTarget(importer = (url) => import(url)) {
  try {
    return await importer(targetURL.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error.url === targetURL.href) {
      assert.fail(`Missing target module [${error.code}] ${error.url}\n${error.stack ?? error.message}`);
    }
    throw error;
  }
}

test('loader classification (injected errors; not a filesystem TDD Red)', async (t) => {
  await t.test('loads the exact target URL and preserves the namespace', async () => {
    const namespace = { greeting: () => 'sentinel' };
    let calls = 0;
    assert.equal(await loadTarget(async (url) => {
      calls += 1;
      assert.equal(url, targetURL.href);
      return namespace;
    }), namespace);
    assert.equal(calls, 1);
  });

  await t.test('only the exact missing target becomes an AssertionError', async () => {
    const missing = Object.assign(new Error('injected missing entry'), {
      code: 'ERR_MODULE_NOT_FOUND', url: targetURL.href,
    });
    await assert.rejects(loadTarget(async () => { throw missing; }), (error) => {
      assert.ok(error instanceof assert.AssertionError);
      assert.equal(error.code, 'ERR_ASSERTION');
      assert.ok(error.message.includes(targetURL.href));
      assert.ok(error.message.includes('ERR_MODULE_NOT_FOUND'));
      assert.ok(error.message.includes('injected missing entry'));
      return true;
    });
  });

  const failures = [
    ['transitive missing file mentioning the target', Object.assign(
      new Error(`Dependency missing, imported from ${targetURL.href}`),
      { code: 'ERR_MODULE_NOT_FOUND', url: new URL('./missing-dependency.mjs', targetURL).href },
    )],
    ['missing package without a URL', Object.assign(new Error('Missing package'), {
      code: 'ERR_MODULE_NOT_FOUND',
    })],
    ['message-only target identity', Object.assign(new Error(`Cannot find ${targetURL.href}`), {
      code: 'ERR_MODULE_NOT_FOUND',
    })],
    ['similar URL', Object.assign(new Error('Different URL'), {
      code: 'ERR_MODULE_NOT_FOUND', url: `${targetURL.href}.backup`,
    })],
    ['target URL with query', Object.assign(new Error('Different module identity'), {
      code: 'ERR_MODULE_NOT_FOUND', url: `${targetURL.href}?other`,
    })],
    ['URL object instead of the loader URL string', Object.assign(new Error('Unrecognized identity'), {
      code: 'ERR_MODULE_NOT_FOUND', url: targetURL,
    })],
    ['syntax error', new SyntaxError('Injected parse failure')],
    ['runtime error', new TypeError('Injected evaluation failure')],
    ['permission error at the target', Object.assign(new Error('Access denied'), {
      code: 'EACCES', url: targetURL.href,
    })],
    ['unsupported import environment', Object.assign(new Error('Unsupported loader'), {
      code: 'ERR_UNKNOWN_FILE_EXTENSION', url: targetURL.href,
    })],
    ['non-Error rejection', 'injected rejection'],
    ['null rejection', null],
  ];
  for (const [label, failure] of failures) {
    await t.test(`preserves ${label}`, async () => {
      await assert.rejects(loadTarget(async () => { throw failure; }), (error) => {
        assert.equal(error, failure);
        return true;
      });
    });
  }
});

// Explicit ECMAScript trim characters, never derived from the implementation.
const whitespace = [
  '\u0009', '\u000A', '\u000B', '\u000C', '\u000D', '\u0020', '\u00A0', '\u1680',
  '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006', '\u2007',
  '\u2008', '\u2009', '\u200A', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF',
];

test('Feature greeting acceptance: AC-GREET and AC-INVALID', async (t) => {
  const namespace = await loadTarget();
  assert.equal(typeof namespace.greeting, 'function');
  const { greeting } = namespace;

  const valid = [
    ['surrounding spaces', '  Ada  ', 'Hello, Ada!'],
    ['already trimmed', 'Ada', 'Hello, Ada!'],
    ['internal double spaces', '  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
    ['mixed surrounding whitespace', '\t\n\r\u00A0Ada\uFEFF\r\n\t', 'Hello, Ada!'],
    ['internal tabs, newlines and Unicode', '  Ada\tLovelace\n王  ', 'Hello, Ada\tLovelace\n王!'],
    ['single character', ' A ', 'Hello, A!'],
    ['zero width space is retained', '\u200BAda\u200B', 'Hello, \u200BAda\u200B!'],
  ];
  for (const [label, input, expected] of valid) {
    await t.test(`AC-GREET: ${label}`, () => assert.equal(greeting(input), expected));
  }
  for (const character of whitespace) {
    const label = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    await t.test(`AC-GREET: trim U+${label}`, () => {
      assert.equal(greeting(`${character}Ada${character}`), 'Hello, Ada!');
    });
    await t.test(`AC-INVALID: whitespace-only U+${label}`, () => {
      assert.throws(() => greeting(character), TypeError);
    });
  }

  const invalid = [
    ['empty string', ''], ['spaces', '   '], ['tabs and newlines', '\t\n\r'],
    ['mixed whitespace', '\u00A0\t\uFEFF\n '],
    ['undefined', undefined], ['null', null], ['zero', 0], ['number', 42],
    ['NaN', NaN], ['Infinity', Infinity], ['false', false], ['true', true],
    ['object', {}], ['empty array', []], ['name array', ['Ada']],
    ['Symbol', Symbol('Ada')], ['BigInt', 1n], ['function', () => 'Ada'],
    ['boxed string', new String('Ada')],
  ];
  await t.test('AC-INVALID: omitted argument', () => {
    assert.throws(() => greeting(), TypeError);
  });
  for (const [label, input] of invalid) {
    await t.test(`AC-INVALID: ${label}`, () => {
      assert.throws(() => greeting(input), TypeError);
    });
  }
  await t.test('AC-INVALID: reject objects without trimming or coercion', () => {
    const calls = [];
    const input = {
      trim() { calls.push('trim'); return 'Ada'; },
      toString() { calls.push('toString'); return 'Ada'; },
      valueOf() { calls.push('valueOf'); return 'Ada'; },
      [Symbol.toPrimitive]() { calls.push('toPrimitive'); return 'Ada'; },
    };
    assert.throws(() => greeting(input), TypeError);
    assert.deepEqual(calls, []);
  });
  await t.test('AC-INVALID / AC-GREET: recovery and independent calls', () => {
    assert.throws(() => greeting(' \t\n'), TypeError);
    assert.throws(() => greeting({}), TypeError);
    assert.equal(greeting('  Ada  '), 'Hello, Ada!');
    assert.equal(greeting(' Grace '), 'Hello, Grace!');
    assert.equal(greeting(' 王 '), 'Hello, 王!');
    assert.equal(greeting('Ada'), 'Hello, Ada!');
  });
});
