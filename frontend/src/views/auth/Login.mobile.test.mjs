import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./Login.vue', import.meta.url), 'utf8')
const tabletStyles = source.slice(
  source.indexOf('@media (max-width: 768px)'),
  source.indexOf('@media (max-width: 480px)'),
)
const phoneStyles = source.slice(source.indexOf('@media (max-width: 480px)'))

test('phone login puts the form before the showcase and reserves room for the header', () => {
  assert.match(tabletStyles, /\.login-layout\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?padding-top:\s*max\(/)
  assert.match(tabletStyles, /\.login-layout\s*\{[\s\S]*?min-height:\s*100dvh;[\s\S]*?overflow-y:\s*auto;/)
  assert.match(tabletStyles, /\.form-section\s*\{[\s\S]*?order:\s*-1;/)
})

test('tablet login hides header link labels to avoid overlapping the logo', () => {
  assert.match(tabletStyles, /\.header-links\s*\{[\s\S]*?\.link-text\s*\{\s*display:\s*none;/)
})

test('narrow login headers use icon-only links to avoid overlapping the logo', () => {
  assert.match(phoneStyles, /\.header-links\s*\{[\s\S]*?\.link-text\s*\{\s*display:\s*none;/)
})

test('login page uses GSMS brand assets and landing site links', () => {
  assert.doesNotMatch(source, /weknora\.png/)
  assert.doesNotMatch(source, /github\.com\/Tencent\/WeKnora/)
  assert.doesNotMatch(source, /weknora\.weixin\.qq\.com/)
  assert.match(source, /@\/assets\/brand\/logo-transparent\.svg/)
  assert.match(source, /resolveLandingSiteUrl/)
})