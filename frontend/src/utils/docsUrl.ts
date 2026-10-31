import { docsBaseUrl } from './runtimeConfig'

/**
 * Doc pages linked from the UI, as website-docs paths without the `.md`
 * suffix. docsUrl.test.ts checks each one (and its anchor) still exists.
 */
export const DOC_PAGES = {
  home: '',
  tenantAuth: '03-features/01-tenant-auth',
  models: '03-features/06-models',
  modelsCompat: '03-features/06-models#couverture-compatibilite-protocole-compat-json',
  knowledgeGraph: '03-features/09-knowledge-graph',
  imIntegration: '03-features/12-im-integration',
  apiOverview: '04-api/01-api-overview',
  troubleshootingMigrations: '01-getting-started/05-troubleshooting#database-migrations',
  sandboxDeployment: '06-development/04-sandbox-deployment',
} as const

export type DocPage = keyof typeof DOC_PAGES

export function docsUrl(page: DocPage): string {
  return docsBaseUrl() + DOC_PAGES[page]
}
