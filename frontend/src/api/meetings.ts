import { get, post, put, del } from '@/utils/request'

interface Envelope<T> {
  success: boolean
  data: T
}

export type MeetingProvider = 'teams' | 'zoom' | 'google_meet'

export interface MeetingProviderStatus {
  provider: MeetingProvider
  /** True once an admin created this connection in the UI. */
  added: boolean
  /** True when a client id and secret are available (UI or server .env). */
  configured: boolean
  client_id?: string
  secret_configured: boolean
  app_tenant?: string
  connected: boolean
  account_label?: string
  knowledge_base_id?: string
  auto_sync: boolean
  publish: boolean
  last_synced_at?: string
  last_sync_error?: string
  imported_count: number
}

export interface MeetingsStatus {
  encryption_active: boolean
  /** OAuth redirect URL to register in each platform's developer console. */
  redirect_url: string
  providers: MeetingProviderStatus[]
}

export interface MeetingSettings {
  knowledge_base_id: string
  auto_sync: boolean
  publish: boolean
}

const BASE = '/api/v1/integrations/meetings'

export function getMeetingsStatus() {
  return get<Envelope<MeetingsStatus>>(`${BASE}/status`)
}

export interface MeetingApp {
  client_id: string
  /** Empty keeps the stored secret. */
  client_secret: string
  /** Microsoft Entra tenant (Teams only); empty accepts any work account. */
  app_tenant: string
}

export function saveMeetingApp(provider: MeetingProvider, app: MeetingApp) {
  return put<Envelope<MeetingProviderStatus>>(`${BASE}/providers/${provider}/app`, app)
}

/** Returns the platform sign-in page, opened in a popup that reports back with postMessage. */
export function startMeetingAuth(provider: MeetingProvider) {
  return post<Envelope<{ auth_url: string }>>(`${BASE}/providers/${provider}/auth/start`, {})
}

export function updateMeetingSettings(provider: MeetingProvider, settings: MeetingSettings) {
  return put<Envelope<MeetingProviderStatus>>(`${BASE}/providers/${provider}/settings`, settings)
}

export function pullMeetingsNow(provider: MeetingProvider) {
  return post<Envelope<{ task_id: string }>>(`${BASE}/providers/${provider}/pull`, {})
}

export function disconnectMeetingProvider(provider: MeetingProvider) {
  return del(`${BASE}/providers/${provider}/connection`)
}
