import { createI18n } from 'vue-i18n'
import frFR from './locales/fr-FR.ts'
import enUS from './locales/en-US.ts'
import { isSupportedLocale, resolveDefaultLocale } from './resolveDefaultLocale.ts'
import { pluralRules } from './pluralizationRules.ts'

const messages = {
  'fr-FR': frFR,
  'en-US': enUS,
}

// User's explicit past choice wins (when still offered); otherwise use the deployment default.
const storedLocale = localStorage.getItem('locale')
const savedLocale = storedLocale && isSupportedLocale(storedLocale) ? storedLocale : resolveDefaultLocale(
  window.__RUNTIME_CONFIG__?.DEFAULT_LOCALE,
  import.meta.env.VITE_DEFAULT_LOCALE,
)

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en-US',
  globalInjection: true,
  pluralRules,
  // Some translations intentionally embed `<strong>` markup (e.g. agent step summaries).
  // We render them via v-html with our own sanitization, so silence vue-i18n's HTML warning
  // to avoid flooding the console and slowing renders during history loads.
  warnHtmlMessage: false,
  messages
})

export default i18n
