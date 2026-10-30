import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('platform shell drops desktop min-width on narrow viewports', () => {
  assert.match(
    source,
    /@media \(max-width: 768px\)\s*\{[\s\S]*?\.main\s*\{[\s\S]*?min-width:\s*0;/,
  )
})
