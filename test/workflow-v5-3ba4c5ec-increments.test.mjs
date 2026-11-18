import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from '../src/workflow-v5-b55d65d7/greeting.mjs';

test('increment 1: valid prefixes and defaults', () => {
  assert.equal(greeting(' Ada ', { prefix: ' Hi ' }), 'Hi, Ada!');
  for (const options of [undefined, {}, Object.create(null)]) {
    assert.equal(greeting(' Ada ', options), 'Hello, Ada!');
  }
  assert.equal(greeting(' Ada  Lovelace ', { prefix: ' Good  day ' }), 'Good  day, Ada  Lovelace!');
  assert.equal(greeting(' Ada ', Object.assign(Object.create(null), { prefix: ' Hey ' })), 'Hey, Ada!');
});

test('increment 2: reject invalid options and prefixes', () => {
  for (const options of [null, [], () => {}, 1, 'Hi', Object.create({}), new (class {})()]) {
    assert.throws(() => greeting('Ada', options), TypeError);
  }
  for (const prefix of [undefined, null, 1, false, Symbol(), 1n, {}, new String('Hi'), '', ' \t ']) {
    assert.throws(() => greeting('Ada', { prefix }), TypeError);
  }
});

test('increment 2: name first, getter once, original exception', () => {
  const untouched = new Proxy({}, { getPrototypeOf() { assert.fail('name first'); },
    getOwnPropertyDescriptor() { assert.fail('name first'); }, get() { assert.fail('name first'); } });
  for (const name of [null, {}, '', ' \t ']) assert.throws(() => greeting(name, untouched), TypeError);
  for (const value of [' Hi ', undefined, ' ']) {
    let reads = 0;
    const options = { get prefix() { reads++; return value; } };
    if (value === ' Hi ') assert.equal(greeting('Ada', options), 'Hi, Ada!');
    else assert.throws(() => greeting('Ada', options), TypeError);
    assert.equal(reads, 1);
  }
  const sentinel = {};
  let reads = 0;
  assert.throws(() => greeting('Ada', { get prefix() { reads++; throw sentinel; } }), error => error === sentinel);
  assert.equal(reads, 1);
});
