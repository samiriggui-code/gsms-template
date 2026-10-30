import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const less = readFileSync(new URL('./platform-viewport-mobile.less', import.meta.url), 'utf8')
const main = readFileSync(new URL('../../main.ts', import.meta.url), 'utf8')

test('platform viewport mobile stylesheet is wired into the app bundle', () => {
  assert.match(main, /platform-viewport-mobile\.less/)
  assert.match(less, /@media \(max-width: @platform-mobile-max\)/)
  assert.match(less, /@platform-mobile-max:\s*768px/)
  assert.match(less, /\.platform-route-outlet/)
  assert.match(less, /overflow-x:\s*auto/)
  assert.match(less, /\.settings-modal-shell \.setting-row/)
  assert.match(less, /flex-direction:\s*column/)
})
