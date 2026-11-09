import test from 'node:test';
import assert from 'node:assert/strict';

// Frozen Task recipe: node --test tests/workflow-62a1efde/behavior.test.mjs
// Assertions exercise only the public API; expected values are literal data.
test('greeting: AC-GREET and AC-INVALID', async (t) => {
  let target;
  try {
    target = await import('../../src/workflow-62a1efde-greeting.mjs');
  } catch (error) {
    assert.fail(`Target module import failed: ${String(error)}`);
  }
  assert.equal(typeof target.greeting, 'function', 'named greeting export');
  const { greeting } = target;

  const validCases = [
    ['surrounding spaces', '  Ada  ', 'Hello, Ada!'],
    ['already trimmed', 'Ada', 'Hello, Ada!'],
    ['internal double space', '  Ada  Lovelace  ', 'Hello, Ada  Lovelace!'],
    ['mixed outer whitespace', '\t\n\r\u00A0Ada\uFEFF\r\n\t', 'Hello, Ada!'],
    ['internal whitespace and Unicode', '  Ada\tLovelace\n王  ', 'Hello, Ada\tLovelace\n王!'],
    ['single character', ' A ', 'Hello, A!'],
    ['zero width spaces are preserved', '\u200BAda\u200B', 'Hello, \u200BAda\u200B!'],
    ['Unicode is not normalized', '  e\u0301  ', 'Hello, e\u0301!'],
  ];
  for (const [label, input, expected] of validCases) {
    await t.test(`AC-GREET: ${label}`, () => {
      assert.equal(greeting(input), expected);
    });
  }

  const whitespaceCases = [
    ['U+0009', '\u0009'], ['U+000A', '\u000A'],
    ['U+000B', '\u000B'], ['U+000C', '\u000C'],
    ['U+000D', '\u000D'], ['U+0020', '\u0020'],
    ['U+00A0', '\u00A0'], ['U+1680', '\u1680'],
    ['U+2000', '\u2000'], ['U+2001', '\u2001'],
    ['U+2002', '\u2002'], ['U+2003', '\u2003'],
    ['U+2004', '\u2004'], ['U+2005', '\u2005'],
    ['U+2006', '\u2006'], ['U+2007', '\u2007'],
    ['U+2008', '\u2008'], ['U+2009', '\u2009'],
    ['U+200A', '\u200A'], ['U+2028', '\u2028'],
    ['U+2029', '\u2029'], ['U+202F', '\u202F'],
    ['U+205F', '\u205F'], ['U+3000', '\u3000'],
    ['U+FEFF', '\uFEFF'],
  ];
  for (const [label, whitespace] of whitespaceCases) {
    await t.test(`AC-GREET: trims ${label} at both ends`, () => {
      assert.equal(greeting(`${whitespace}Ada${whitespace}`), 'Hello, Ada!');
    });
    await t.test(`AC-INVALID: rejects only ${label}`, () => {
      assert.throws(() => greeting(whitespace), TypeError);
    });
  }

  const invalidCases = [
    ['empty string', ''],
    ['spaces', '   '],
    ['tabs and newlines', '\t\n\r'],
    ['mixed whitespace', ' \t\n\u00A0\u1680\u2003\u2028\u202F\u3000\uFEFF'],
    ['explicit undefined', undefined],
    ['null', null],
    ['zero', 0],
    ['number', 42],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['false', false],
    ['true', true],
    ['plain object', {}],
    ['empty array', []],
    ['name array', ['Ada']],
    ['Symbol', Symbol('Ada')],
    ['BigInt', 42n],
    ['function', () => 'Ada'],
    ['boxed string', new String('Ada')],
  ];
  for (const [label, input] of invalidCases) {
    await t.test(`AC-INVALID: synchronously rejects ${label}`, () => {
      assert.throws(() => greeting(input), TypeError);
    });
  }

  await t.test('AC-INVALID: omitted argument', () => {
    assert.throws(() => greeting(), TypeError);
  });

  await t.test('AC-INVALID: rejects objects without invoking their hooks', () => {
    const calls = [];
    const input = {
      get trim() {
        calls.push('trim');
        return () => 'Ada';
      },
      [Symbol.toPrimitive]() {
        calls.push('Symbol.toPrimitive');
        return 'Ada';
      },
      toString() {
        calls.push('toString');
        return 'Ada';
      },
      valueOf() {
        calls.push('valueOf');
        return 'Ada';
      },
    };
    assert.throws(() => greeting(input), TypeError);
    assert.deepEqual(calls, []);
  });

  await t.test('AC-GREET / AC-INVALID: calls remain independent after failures', () => {
    assert.equal(greeting(' Grace '), 'Hello, Grace!');
    assert.throws(() => greeting(' \t\n '), TypeError);
    assert.throws(() => greeting({}), TypeError);
    assert.equal(greeting('  Ada  '), 'Hello, Ada!');
    assert.equal(greeting('  王  '), 'Hello, 王!');
    assert.equal(greeting('Grace'), 'Hello, Grace!');
  });
});
