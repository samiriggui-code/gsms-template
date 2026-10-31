import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vitepressPort = 5173;
const homepagePort = 3001;
const gatewayPort = Number(process.env.HOMEPAGE_DEV_PORT ?? 3000);
const vitepressOrigin = `http://127.0.0.1:${vitepressPort}`;

function npm(args, cwd, env = process.env) {
  const npmCLI = process.env.npm_execpath;
  if (!npmCLI) throw new Error('Run through npm so npm_execpath is available.');
  return spawn(process.execPath, [npmCLI, ...args], { cwd, stdio: 'inherit', env });
}

async function waitForUrl(url, maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return;
    } catch {
      /* server still starting */
    }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Service did not become ready: ${url}`);
}

/** VitePress owns most of /docs/; Next keeps benchmarks and homepage static assets. */
function upstreamPort(pathname) {
  if (pathname.startsWith('/docs/_home') || pathname.startsWith('/docs/models')) {
    return homepagePort;
  }
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    return vitepressPort;
  }
  return homepagePort;
}

function proxyRequest(targetPort, req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };
  const upstream = httpRequest(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    },
    upstreamRes => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Upstream unavailable');
  });
  req.on('error', () => upstream.destroy());
  res.on('error', () => upstream.destroy());
  upstream.on('error', () => req.destroy());
  req.pipe(upstream);
}

function proxyUpgrade(targetPort, req, socket, head) {
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };
  const upstream = httpRequest({
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers,
  });
  upstream.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    const lines = [`HTTP/1.1 ${upstreamRes.statusCode ?? 101} ${upstreamRes.statusMessage || 'Switching Protocols'}`];
    for (const [key, value] of Object.entries(upstreamRes.headers)) {
      if (value == null) continue;
      for (const item of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${item}`);
    }
    socket.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (upstreamHead?.length) socket.write(upstreamHead);
    if (head?.length) upstreamSocket.write(head);
    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
    upstreamSocket.on('error', () => socket.destroy());
    socket.on('error', () => upstreamSocket.destroy());
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  upstream.end();
}

const children = [];
function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (!existsSync(resolve(root, 'node_modules'))) {
  console.error('Dependencies missing. Run: npm run setup');
  process.exit(1);
}

console.log('Starting VitePress (documentation)…');
const docs = npm(['run', 'dev:docs', '--', '--port', String(vitepressPort), '--host', '127.0.0.1'], root);
children.push(docs);

try {
  await waitForUrl(`${vitepressOrigin}/docs/`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}

console.log('Starting homepage (Next.js)…');
const homepage = npm(
  ['run', 'dev', '--prefix', 'homepage', '--', '--port', String(homepagePort), '--hostname', '127.0.0.1'],
  root,
);
children.push(homepage);

try {
  await waitForUrl(`http://127.0.0.1:${homepagePort}/`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}

const gateway = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400).end();
    return;
  }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/docs') {
    res.writeHead(308, { Location: '/docs/' + url.search }).end();
    return;
  }
  proxyRequest(upstreamPort(url.pathname), req, res);
});
gateway.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  proxyUpgrade(upstreamPort(pathname), req, socket, head);
});
gateway.listen({ port: gatewayPort, host: '::', ipv6Only: false }, () => {
  console.log(`Unified dev: http://127.0.0.1:${gatewayPort}/ and http://localhost:${gatewayPort}/  (docs → VitePress, home → Next)`);
});
children.push({ kill: () => gateway.close() });

docs.on('exit', code => {
  if (code && code !== 0) shutdown(code);
});
homepage.on('exit', code => {
  if (code && code !== 0) shutdown(code);
});
