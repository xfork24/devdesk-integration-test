import assert from 'node:assert/strict';

export async function loadTarget(target, diagnostic, importer = (url) => import(url)) {
  try {
    return await importer(target.href);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && error.url === target.href) {
      assert.fail('Target implementation is missing: ' + target.href);
    }
    diagnostic('IMPORT/ENVIRONMENT ERROR: not an expected behavioral Red');
    throw error;
  }
}
