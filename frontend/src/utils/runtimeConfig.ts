// Window.__RUNTIME_CONFIG__ is declared in ./index.ts.

const DEFAULT_PUBLIC_SITE = 'https://www.global-it-ss.com'
const DEFAULT_DOCS_BASE = 'https://www.global-it-ss.com/docs/'

function pickUrl(...candidates: (string | undefined)[]): string {
  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return ''
}

/** Vitrine Global-IT-SS (homepage), pas le site officiel WeKnora. */
export function publicSiteUrl(): string {
  const raw = pickUrl(
    typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.PUBLIC_SITE_URL : undefined,
    import.meta.env?.VITE_PUBLIC_SITE_URL,
    DEFAULT_PUBLIC_SITE,
  )
  return raw.replace(/\/$/, '')
}

/** Documentation produit hébergée avec la vitrine (website-docs). */
export function docsBaseUrl(): string {
  const raw = pickUrl(
    typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.DOCS_BASE_URL : undefined,
    import.meta.env?.VITE_DOCS_BASE_URL,
    DEFAULT_DOCS_BASE,
  )
  return raw.endsWith('/') ? raw : `${raw}/`
}
