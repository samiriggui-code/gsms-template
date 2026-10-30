import assert from 'node:assert/strict'
import test from 'node:test'

test('resolveLandingSiteUrl falls back to Global-IT-SS default', async () => {
  const { resolveLandingSiteUrl } = await import('./landingSiteUrl.ts')
  assert.equal(resolveLandingSiteUrl(), 'https://www.global-it-ss.com')
})
