import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const output = join(process.cwd(), 'out');
const html = await readFile(join(output, 'index.html'), 'utf8');
const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'The homepage must have one main heading');
for (const term of ['Global-IT-SS', 'orchestrée avec exigence', 'Neuf expertises', 'Moteur IA', 'Trouvez la bonne réponse', 'mettez la connaissance en action', 'v0.9.0', 'RAG', 'Agent', 'Wiki', 'ClawHub', 'SkillHub', 'Docker', 'E2B', 'Cube', 'Mémoire longue durée', 'Terminal interactif', 'Bureau graphique', 'Navigateur local', 'BrowserSkill', 'MCP Server', 'galerie', 'Embeddings multimodaux', '30 fournisseurs intégrés', 'Retour arrière de version', 'Citation à la source', 'Lecture des pièces jointes à la demande', 'Gestion des utilisateurs plateforme', 'Seafile', 'Confluence', 'DingTalk', 'GitLab', 'Tencent IMA', 'LiteLLM', 'DeepSeek Harness']) {
  assert.ok(visible.includes(term), `Missing product content: ${term}`);
}
for (const term of ['三套', '方案选择', '历史 Demo', '18K+', '成为行动力', '从零散文档', '到鲜活知识', '模型接入与目录管理']) {
  assert.ok(!visible.includes(term), `Retired content still visible: ${term}`);
}
const films = html.match(/<figure id="demo"[\s\S]*?<\/figure>/)?.[0];
assert.ok(films, 'Keep the product film on the homepage');
assert.equal((films.match(/<video\b/g) || []).length, 1, 'Films must share one player');
const selectedFilm = films.match(/<button[^>]*aria-pressed="true"[^>]*>([\s\S]*?)<\/button>/)?.[1];
assert.ok(selectedFilm?.includes('Sortie v0.9.0'), 'Feature the current release first');
assert.ok(films.includes('Vue d’ensemble du produit'), 'Keep the previous product film selectable');
assert.match(films, /poster="\/docs\/videos\/weknora-v0.9.0-poster.png"/, 'Use the approved release cover');
assert.match(films, /https:\/\/github.com\/user-attachments\/assets\/de0e490a-e738-405e-bb3a-64b63edd7278/, 'Link to the current README film');
assert.match(films, /<video[^>]+preload="none"/, 'Video should not load before user interaction');
assert.ok(!/<video[^>]+(?:autoplay|\bsrc=)/i.test(films), 'Load the selected film only after playback is requested');
const capabilities = html.match(/<section id="capabilities"[\s\S]*?<\/section>/)?.[0];
assert.ok(capabilities && !capabilities.toLowerCase().includes('galerie') && !capabilities.includes('En savoir plus'), 'Keep gallery and cross-topic links out of the RAG, Agent and Wiki overview');
const gallery = html.match(/<section id="knowledge-gallery"[\s\S]*?<\/section>/)?.[0];
for (const term of ['kb-image-gallery.png', 'kb-image-gallery-detail.png', 'Base de connaissances et galerie', '02-knowledge-base.html#image-gallery']) {
  assert.ok(gallery?.includes(term), `Missing knowledge gallery showcase: ${term}`);
}
const wiki = html.match(/<section id="wiki"[\s\S]*?<\/section>/)?.[0];
assert.ok(wiki, 'The homepage must include a dedicated Wiki section');
for (const term of ['/docs/_home/product/wiki-browser.png', '/docs/_home/product/wiki-graph-groups.png', '/docs/_home/product/wiki-revision-history.png', 'id="wiki-gallery"', '/docs/03-features/14-wiki.html', 'citations sources', 'Graphe de connaissances', 'description thématique', 'vue d’ensemble', 'différences de version']) {
  assert.ok(wiki.includes(term), `Missing Wiki showcase content: ${term}`);
}
// Release highlights and enduring capabilities must survive independently.
const release = html.match(/<section id="release"[\s\S]*?<\/section>/)?.[0];
for (const term of ['Assistant WeKnora, collaboration multi-agents et automatisations', 'Collaboration multi-agents', 'Automatisations', 'Permissions d’exécution et approbations', 'Sandbox réutilisable par utilisateur', 'Synchronisation Feishu / Lark', 'Questions produit', 'Aide aux tâches', 'Configuration en une phrase', 'Configuration manuelle', 'en votre nom']) {
  assert.ok(release?.includes(term), `Missing release highlight: ${term}`);
}
for (const shot of ['assistant-release-guide', 'assistant-overview', 'agent-collaboration', 'automation-conversation', 'automation-setup', 'assistant-permissions']) {
  assert.ok(release.includes(`src="/docs/_home/product/${shot}.png"`), `Missing release screenshot: ${shot}`);
}
const browser = html.match(/<section id="agent-workflow"[\s\S]*?<\/section>/)?.[0];
assert.ok(browser?.includes('/docs/_home/product/local-browser-task.png') && browser.includes('BrowserSkill'), 'Keep the local browser showcase outside the release section');
for (const asset of ['browser-connection.png', 'browserskill.png']) {
  assert.ok(browser.includes(asset), `Missing browser showcase asset: ${asset}`);
}
const ecosystem = html.match(/<section id="ecosystem"[\s\S]*?<\/section>/)?.[0];
assert.ok(ecosystem?.includes('Partager les connaissances via le serveur MCP') && ecosystem.includes('/docs/03-features/08-mcp.html'), 'Keep MCP Server in the integrations section');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
  assert.ok(ids.has(anchor), `Missing navigation target: #${anchor}`);
}
const assets = new Set([...html.matchAll(/(?:src|href|poster)="(\/[^"?#]*)/g)].map(match => match[1]));
for (const asset of assets) {
  const path = join(output, decodeURIComponent(asset));
  let file = await stat(path);
  if (file.isDirectory()) file = await stat(join(path, 'index.html'));
  assert.ok(file.isFile() && file.size > 0, `Missing local asset: ${asset}`);
}
const pendingShots = [...html.matchAll(/website-docs\/homepage\/public(\/docs\/_home\/product\/[\w.-]+)/g)].map(match => match[1]);
// Gallery slides without a file render their placeholder only once selected; read the flag from the page data.
for (const [, image] of html.matchAll(/\\?"image\\?":\\?"([\w-]+)\\?"[^{}]*?\\?"available\\?":false/g)) pendingShots.push(`/docs/_home/product/${image}.png`);
if (pendingShots.length) console.warn(`Product screenshots still pending (placeholder shown): ${[...new Set(pendingShots)].join(', ')}`);
assert.match(html, /aria-controls="main-navigation"/);
assert.match(html, /aria-label="Lire la vidéo Assistant de travail v0.9.0/);
console.log(`Homepage audit passed: product content, release-first video selection, navigation anchors, ${assets.size} local assets, and retired design choices.`);
