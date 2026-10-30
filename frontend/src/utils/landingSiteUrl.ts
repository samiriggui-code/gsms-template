const DEFAULT_LANDING_SITE_URL = 'https://www.global-it-ss.com'

type RuntimeConfig = {
  LANDING_URL?: string
}

function normalizeLandingUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : undefined)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.href.replace(/\/$/, '')
  } catch {
    return ''
  }
}

/** Public marketing / landing site (Global-IT-SS). */
export function resolveLandingSiteUrl(): string {
  const fromEnv = import.meta.env?.VITE_LANDING_URL
  if (typeof fromEnv === 'string') {
    const normalized = normalizeLandingUrl(fromEnv)
    if (normalized) return normalized
  }
  if (typeof window !== 'undefined') {
    const runtime = (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__
    const fromRuntime = runtime?.LANDING_URL
    if (typeof fromRuntime === 'string') {
      const normalized = normalizeLandingUrl(fromRuntime)
      if (normalized) return normalized
    }
  }
  return DEFAULT_LANDING_SITE_URL
}
