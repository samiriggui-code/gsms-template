// Global-IT-SS ships French first and English second; the other WeKnora
// locale files stay on disk for upstream syncs but are not offered.
export const SUPPORTED_LOCALES = ['fr-FR', 'en-US'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const BUILT_IN_DEFAULT: SupportedLocale = 'fr-FR'

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Resolve deployment default locale before any user preference is applied. */
export function resolveDefaultLocale(
  runtimeLocale?: string | null,
  buildTimeLocale?: string | null,
): SupportedLocale {
  const raw = runtimeLocale || buildTimeLocale || BUILT_IN_DEFAULT
  const candidate = typeof raw === 'string' ? raw.trim() : BUILT_IN_DEFAULT
  return isSupportedLocale(candidate) ? candidate : BUILT_IN_DEFAULT
}

/** BCP 47 primary language subtag for `<html lang="…">` (e.g. fr-FR → fr). */
export function localeToHtmlLang(locale: string): string {
  const tag = typeof locale === 'string' ? locale.trim() : BUILT_IN_DEFAULT
  const primary = tag.split('-')[0]?.toLowerCase()
  return primary || 'fr'
}

export function syncDocumentHtmlLang(locale: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = localeToHtmlLang(locale)
}
