import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Record<string, { fr?: string, en?: string }>} */
const titles = {
  '03-features/01-tenant-auth.md': {
    fr: 'Tenants, utilisateurs et authentification',
    en: 'Tenants, users, and authentication',
  },
  '03-features/02-knowledge-base.md': {
    fr: 'Bases de connaissances et gestion des sources',
    en: 'Knowledge bases and knowledge management',
  },
  '03-features/03-document-parsing.md': {
    fr: 'Service d’analyse documentaire docreader',
    en: 'Document parsing service (docreader)',
  },
  '03-features/06-models.md': { fr: 'Gestion des modèles', en: 'Model management' },
  '03-features/07-agent.md': { fr: 'Moteur Agent', en: 'Agent engine' },
  '03-features/08-mcp.md': {
    fr: 'Intégration MCP (Model Context Protocol)',
    en: 'MCP (Model Context Protocol) integration',
  },
  '04-api/01-api-overview.md': { fr: 'Vue d’ensemble de l’API', en: 'API overview' },
  '04-api/02-api-agent-mcp.md': { fr: 'API : Agent, MCP et skills', en: 'API reference: Agent, MCP, and skills' },
  '04-api/02-api-auth.md': { fr: 'API : authentification et utilisateurs', en: 'API reference: authentication and users' },
  '04-api/02-api-automations.md': { fr: 'API : automatisations et notifications', en: 'API reference: automations and notifications' },
  '04-api/02-api-channels.md': { fr: 'API : IM, embed et fichiers', en: 'API reference: IM, embed, and file services' },
  '04-api/02-api-chat.md': { fr: 'API : sessions, messages et chat', en: 'API reference: sessions, messages, and chat' },
  '04-api/02-api-chunks.md': { fr: 'API : chunks et tags', en: 'API reference: chunks and tags' },
  '04-api/02-api-faq-wiki.md': { fr: 'API : FAQ et Wiki', en: 'API reference: FAQ and Wiki' },
  '04-api/02-api-infra.md': { fr: 'API : infrastructure et sources de données', en: 'API reference: infrastructure and data sources' },
  '04-api/02-api-knowledge.md': { fr: 'API : bases de connaissances et connaissances', en: 'API reference: knowledge bases and knowledge' },
  '04-api/02-api-memory.md': { fr: 'API : mémoire long terme', en: 'API reference: long-term memory' },
  '04-api/02-api-model-system.md': { fr: 'API : modèles et initialisation', en: 'API reference: models and initialization' },
  '04-api/02-api-org.md': { fr: 'API : organisations et partage', en: 'API reference: organizations and sharing' },
  '04-api/02-api-sandbox-skills.md': {
    fr: 'API : sandbox, skills et variables personnelles',
    en: 'API reference: sandbox, skills, and personal variables',
  },
  '04-api/02-api-system.md': { fr: 'API : système et administration plateforme', en: 'API reference: system and platform admin' },
  '04-api/02-api-tenant.md': { fr: 'API : tenants (espaces) et membres', en: 'API reference: tenants and members' },
  '05-clients/01-frontend.md': { fr: 'Frontend Web (frontend/)', en: 'Web frontend (frontend/)' },
  '05-clients/02-cli.md': { fr: 'WeKnora CLI (outil en ligne de commande)', en: 'WeKnora CLI (command-line tool)' },
  '05-clients/04-miniprogram.md': { fr: 'Client mini-programme WeChat', en: 'WeChat mini program client' },
  '05-clients/05-desktop.md': { fr: 'Client bureau (WeKnora Lite Desktop)', en: 'Desktop client (WeKnora Lite Desktop)' },
  '05-clients/06-chrome-extension.md': {
    fr: 'Extension Chrome (assistant de gestion des connaissances)',
    en: 'Chrome extension (knowledge assistant)',
  },
  '05-clients/08-deepseek-harness.md': { fr: 'Plugin DeepSeek Harness', en: 'DeepSeek Harness plugin' },
  '05-clients/09-local-browser.md': {
    fr: 'Navigateur local : intégration et déploiement',
    en: 'Local browser integration and deployment',
  },
  '06-development/01-dev-guide.md': { fr: 'Guide de développement', en: 'Development guide' },
  '06-development/02-database-schema.md': { fr: 'Base de données et migrations', en: 'Database and migrations' },
  '06-development/03-extension-points.md': { fr: 'Guide des points d’extension', en: 'Extension points guide' },
  '06-development/04-sandbox-deployment.md': { fr: 'Déploiement sandbox et dépannage', en: 'Sandbox deployment and troubleshooting' },
  '06-development/05-agent-prompts.md': {
    fr: 'Assemblage des prompts de dialogue et champs éditables',
    en: 'Agent prompt assembly and editable fields',
  },
  '06-development/06-wemm-transformers.md': { fr: 'Déploiement WeMM Transformers', en: 'WeMM Transformers deployment' },
  '07-releases/v0.8.0.md': { fr: 'Notes de version v0.8.0', en: 'Release notes v0.8.0' },
  '07-releases/v0.8.2.md': { fr: 'Notes de version v0.8.2', en: 'Release notes v0.8.2' },
  '07-releases/v0.8.3.md': { fr: 'Notes de version v0.8.3', en: 'Release notes v0.8.3' },
  '07-releases/v0.9.0.md': { fr: 'Notes de version v0.9.0', en: 'Release notes v0.9.0' },
  '02-architecture/03-document-pipeline.md': {
    en: 'Document ingestion pipeline',
  },
  '02-architecture/04-rag-pipeline.md': {
    en: 'End-to-end RAG pipeline',
  },
  '02-architecture/05-async-tasks.md': {
    en: 'Asynchronous task system',
  },
};

function patchFile(absPath, title) {
  const raw = readFileSync(absPath, 'utf-8');
  const next = raw.replace(/^#\s+.+$/m, `# ${title}`);
  if (next === raw) {
    console.warn('no H1 changed:', absPath);
    return;
  }
  writeFileSync(absPath, next, 'utf-8');
  console.log('patched', absPath);
}

for (const [rel, { fr, en }] of Object.entries(titles)) {
  if (fr) patchFile(resolve(root, rel), fr);
  if (en) patchFile(resolve(root, 'en', rel), en);
}

// English sidebar for features already French at root — mirror FR H1 where en/ still Chinese
const enFeatureMirror = [
  '03-features/04-chunking.md',
  '03-features/05-retrieval-engines.md',
  '03-features/09-knowledge-graph.md',
  '03-features/10-datasource.md',
  '03-features/11-web-search.md',
  '03-features/12-im-integration.md',
  '03-features/13-embed-channel.md',
  '03-features/14-wiki.md',
  '03-features/15-evaluation.md',
  '03-features/16-observability.md',
  '03-features/17-faq.md',
  '03-features/18-chat-experience.md',
  '03-features/19-storage-backends.md',
  '03-features/20-platform-admin.md',
  '03-features/21-file-access.md',
  '03-features/22-skills-sandbox.md',
  '03-features/23-memory.md',
  '03-features/24-feishu-drive.md',
  '03-features/25-seafile.md',
  '03-features/26-weknora-assistant.md',
  '03-features/27-automations.md',
  '03-features/28-agent-permissions.md',
  '05-clients/03-go-sdk.md',
  '05-clients/07-claw-skill.md',
];

const enFromFr = {
  '03-features/04-chunking.md': 'Chunking',
  '03-features/05-retrieval-engines.md': 'Retrieval engines and vector storage',
  '03-features/09-knowledge-graph.md': 'Knowledge graph',
  '03-features/10-datasource.md': 'Data source import',
  '03-features/11-web-search.md': 'Web search and page fetching',
  '03-features/12-im-integration.md': 'IM integration',
  '03-features/13-embed-channel.md': 'Web embed channel',
  '03-features/14-wiki.md': 'Wiki',
  '03-features/15-evaluation.md': 'Evaluation',
  '03-features/16-observability.md': 'Observability and audit',
  '03-features/17-faq.md': 'FAQ',
  '03-features/18-chat-experience.md': 'Sessions and chat experience',
  '03-features/19-storage-backends.md': 'Storage backends',
  '03-features/20-platform-admin.md': 'Platform admin and system administrators',
  '03-features/21-file-access.md': 'Public access to images and files',
  '03-features/22-skills-sandbox.md': 'Skills catalog and sandbox',
  '03-features/23-memory.md': 'Cross-session long-term memory',
  '03-features/24-feishu-drive.md': 'Feishu Drive integration',
  '03-features/25-seafile.md': 'Seafile integration',
  '03-features/26-weknora-assistant.md': 'WeKnora assistant',
  '03-features/27-automations.md': 'Automations',
  '03-features/28-agent-permissions.md': 'Execution permissions and approvals',
  '05-clients/03-go-sdk.md': 'Go SDK',
  '05-clients/07-claw-skill.md': 'Claw Skill',
};

for (const rel of enFeatureMirror) {
  const title = enFromFr[rel];
  if (title) patchFile(resolve(root, 'en', rel), title);
}
