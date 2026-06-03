import assert from 'node:assert/strict'
import test from 'node:test'

import { isDynamicImportFetchError } from '../../src/lib/lazyImport.ts'

test('detects failed dynamic import chunk fetches', () => {
  assert.equal(
    isDynamicImportFetchError(new Error('Failed to fetch dynamically imported module: https://www.iglesoft.me/assets/SedesPage-CUkNmCAB.js')),
    true,
  )
})

test('ignores unrelated runtime errors', () => {
  assert.equal(isDynamicImportFetchError(new Error('React is not defined')), false)
})
