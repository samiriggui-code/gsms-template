import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  EMBED_MESSAGES,
  normalizeEmbedLocale,
  SUPPORTED_LOCALES,
} from './embed.ts'

const EXPECTED_CONVERSATION_TIME_KEYS = [
  'today',
  'yesterday',
  'thisYear',
  'otherYear',
] as const

const EXPECTED_REFERENCES_DRAWER_KEYS = [
  'referencesDrawerTitle',
  'referencesDrawerTitleWeb',
  'referencesDrawerTitleDocs',
  'referencesDrawerTitleTools',
  'referencesDrawerTitleMixed',
  'referencesDrawerWebSection',
  'referencesDrawerDocsSection',
  'referencesDrawerToolsSection',
  'referencesDrawerEmpty',
] as const

test('supported embed locales are fr-FR and en-US', () => {
  assert.deepEqual([...SUPPORTED_LOCALES].sort(), ['en-US', 'fr-FR'])
})

test('every supported locale defines conversationTime and referencesDrawer in chat', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const bundle = EMBED_MESSAGES[locale] as {
      chat?: Record<string, unknown>
      common?: Record<string, unknown>
    }
    assert.ok(bundle, `Locale bundle for ${locale} must exist`)
    assert.ok(bundle.chat, `Locale bundle for ${locale} must have chat section`)

    // conversationTime checks
    const conversationTime = bundle.chat.conversationTime as Record<string, string> | undefined
    assert.ok(
      conversationTime && typeof conversationTime === 'object',
      `Locale ${locale} is missing chat.conversationTime`,
    )
    for (const key of EXPECTED_CONVERSATION_TIME_KEYS) {
      assert.equal(
        typeof conversationTime[key],
        'string',
        `Locale ${locale} is missing chat.conversationTime.${key}`,
      )
      assert.ok(
        conversationTime[key].trim().length > 0,
        `chat.conversationTime.${key} in ${locale} should not be empty`,
      )
      assert.ok(
        conversationTime[key].includes('{time}'),
        `chat.conversationTime.${key} in ${locale} must include {time} placeholder`,
      )
    }

    // referencesDrawer checks
    const chatBag = bundle.chat as Record<string, unknown>
    for (const key of EXPECTED_REFERENCES_DRAWER_KEYS) {
      const val: unknown = chatBag[key]
      assert.equal(
        typeof val,
        'string',
        `Locale ${locale} is missing chat.${key}`,
      )
      assert.ok(
        (val as string).trim().length > 0,
        `chat.${key} in ${locale} should not be empty`,
      )
    }

    // common.close check
    assert.ok(bundle.common, `Locale bundle for ${locale} must have common section`)
    assert.equal(
      typeof bundle.common.close,
      'string',
      `Locale ${locale} is missing common.close`,
    )
    assert.ok(
      (bundle.common.close as string).trim().length > 0,
      `common.close in ${locale} should not be empty`,
    )
  }
})

test('locale-specific translations match expected strings for missing keys', () => {
  // fr-FR
  const frChat = EMBED_MESSAGES['fr-FR'].chat as Record<string, any>
  const frCommon = EMBED_MESSAGES['fr-FR'].common as Record<string, any>
  assert.equal(frChat.conversationTime.today, "Aujourd'hui {time}")
  assert.equal(frChat.conversationTime.yesterday, 'Hier {time}')
  assert.equal(frChat.conversationTime.thisYear, '{day}/{month} {time}')
  assert.equal(frChat.conversationTime.otherYear, '{day}/{month}/{year} {time}')
  assert.equal(frChat.referencesDrawerTitleDocs, 'Sources documentaires')
  assert.equal(frChat.referencesDrawerEmpty, 'Aucune source disponible')
  assert.equal(frCommon.close, 'Fermer')

  // en-US
  const enChat = EMBED_MESSAGES['en-US'].chat as Record<string, any>
  const enCommon = EMBED_MESSAGES['en-US'].common as Record<string, any>
  assert.equal(enChat.conversationTime.today, 'Today {time}')
  assert.equal(enChat.conversationTime.yesterday, 'Yesterday {time}')
  assert.equal(enChat.conversationTime.thisYear, '{month}/{day} {time}')
  assert.equal(enChat.conversationTime.otherYear, '{month}/{day}/{year} {time}')
  assert.equal(enChat.referencesDrawerTitleDocs, 'Document sources')
  assert.equal(enChat.referencesDrawerEmpty, 'No sources available')
  assert.equal(enCommon.close, 'Close')
})

test('normalizeEmbedLocale maps English tags to en-US and everything else to fr-FR', () => {
  assert.equal(normalizeEmbedLocale('fr-FR'), 'fr-FR')
  assert.equal(normalizeEmbedLocale('fr'), 'fr-FR')
  assert.equal(normalizeEmbedLocale('FR-ca'), 'fr-FR')
  assert.equal(normalizeEmbedLocale('en-US'), 'en-US')
  assert.equal(normalizeEmbedLocale('en'), 'en-US')
  assert.equal(normalizeEmbedLocale('EN-gb'), 'en-US')
  assert.equal(normalizeEmbedLocale('zh-CN'), 'fr-FR')
  assert.equal(normalizeEmbedLocale('ja-JP'), 'fr-FR')
  assert.equal(normalizeEmbedLocale('unknown-locale'), 'fr-FR')
  assert.equal(normalizeEmbedLocale('   '), 'fr-FR')
})
