import assert from 'node:assert/strict';

export const targetURL = new URL('../../src/workflow-c25565aa-greeting.mjs', import.meta.url).href;

export async function loadGreeting(importer = (url) => import(url)) {
  try {
    return await importer(targetURL);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error.url === targetURL) {
      assert.fail(`Greeting implementation is missing: ${targetURL}`);
    }
    throw error;
  }
}
