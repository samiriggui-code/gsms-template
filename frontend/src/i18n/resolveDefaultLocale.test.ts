import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BUILT_IN_DEFAULT, localeToHtmlLang, resolveDefaultLocale } from './resolveDefaultLocale.ts'

test('resolveDefaultLocale prefers runtime over build-time default', () => {
  assert.equal(resolveDefaultLocale('en-US', 'fr-FR'), 'en-US')
})

test('resolveDefaultLocale falls back to build-time then built-in default', () => {
  assert.equal(resolveDefaultLocale('', 'en-US'), 'en-US')
  assert.equal(resolveDefaultLocale('', 'fr-FR'), 'fr-FR')
  assert.equal(resolveDefaultLocale(undefined, undefined), BUILT_IN_DEFAULT)
})

test('resolveDefaultLocale trims whitespace around supported tags', () => {
  assert.equal(resolveDefaultLocale(' en-US '), 'en-US')
})

test('resolveDefaultLocale rejects unknown values', () => {
  assert.equal(BUILT_IN_DEFAULT, 'fr-FR')
  assert.equal(resolveDefaultLocale('zh-CN'), BUILT_IN_DEFAULT)
  assert.equal(resolveDefaultLocale('en-US"};alert(1);//'), BUILT_IN_DEFAULT)
  assert.equal(resolveDefaultLocale('   '), BUILT_IN_DEFAULT)
})

test('localeToHtmlLang maps supported tags to primary subtags', () => {
  assert.equal(localeToHtmlLang('fr-FR'), 'fr')
  assert.equal(localeToHtmlLang('en-US'), 'en')
  assert.equal(localeToHtmlLang('  en-US  '), 'en')
})
