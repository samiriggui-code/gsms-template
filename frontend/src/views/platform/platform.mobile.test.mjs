import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const platformIndex = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
const menu = readFileSync(new URL('../../components/menu.vue', import.meta.url), 'utf8')
const uiStore = readFileSync(new URL('../../stores/ui.ts', import.meta.url), 'utf8')

test('platform shell drops desktop min-width and exposes a mobile nav opener', () => {
  assert.match(platformIndex, /@media \(max-width: 768px\)[\s\S]*?\.main[\s\S]*?min-width:\s*0;/)
  assert.match(platformIndex, /platform-mobile-nav-open/)
  assert.match(platformIndex, /usePlatformMobile/)
})

test('sidebar menu uses overlay drawer classes on narrow viewports', () => {
  assert.match(menu, /aside_box--platform-mobile/)
  assert.match(menu, /aside_box--mobile-open/)
  assert.match(menu, /closeMobileSidebar/)
})

test('ui store tracks platform mobile and collapses on entry', () => {
  assert.match(uiStore, /platformMobile:\s*false/)
  assert.match(uiStore, /setPlatformMobile\(/)
  assert.match(uiStore, /openMobileSidebar\(/)
})
