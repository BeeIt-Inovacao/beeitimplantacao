#!/usr/bin/env node
// scripts/dev-server.js — Sprint 5.7
// Servidor HTTP local para desenvolvimento.
// Serve public/index.html com substituições em memória (não toca no arquivo):
//   1. Injeta <script> de variáveis locais como primeiro nó do <head>
//   2. Troca URL Supabase produção → local (127.0.0.1:54321)
// Zero dependências externas. Node 20+.
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT       = 5000;
const HOST       = '127.0.0.1';
const ROOT       = path.resolve(__dirname, '..', 'public');
const INDEX_FILE = path.join(ROOT, 'index.html');

const LOCAL_EDGE_URL    = 'http://127.0.0.1:54321/functions/v1/protheus-proxy';
const LOCAL_SB_URL      = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY    = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const PROD_SB_URL       = 'https://dbaqvoatopfquaqgdptk.supabase.co';

const INJECT_BLOCK = `<script>
/* dev-server: variáveis locais — NÃO presente em produção */
window.BEEIT_EDGE_URL    = '${LOCAL_EDGE_URL}';
window.SUPABASE_ANON_KEY = '${LOCAL_ANON_KEY}';
</script>`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

function serveIndex(res) {
  let html;
  try {
    html = fs.readFileSync(INDEX_FILE, 'utf8');
  } catch (e) {
    res.writeHead(500);
    res.end('Erro: public/index.html não encontrado.\n' + e.message);
    return;
  }

  // 1. Troca URL Supabase produção → local (afeta BEEIT_SB_URL e chamadas diretas ao Supabase)
  html = html.replaceAll(PROD_SB_URL, LOCAL_SB_URL);

  // 2. Injeta bloco de variáveis imediatamente após <head>
  html = html.replace('<head>', '<head>\n' + INJECT_BLOCK);

  res.writeHead(200, { 'Content-Type': MIME['.html'] });
  res.end(html);
}

function serveStatic(urlPath, res) {
  const filePath = path.join(ROOT, urlPath);
  // Segurança: impede path traversal fora de ROOT
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0]; // ignora query string

  if (urlPath === '/' || urlPath === '/index.html') {
    serveIndex(res);
    return;
  }

  serveStatic(urlPath, res);
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  BeeIT Dev Server — Sprint 5.7                              │');
  console.log('│                                                             │');
  console.log(`│  URL:        http://${HOST}:${PORT}                        │`);
  console.log(`│  Edge local: ${LOCAL_EDGE_URL}  │`);
  console.log(`│  Supabase:   ${LOCAL_SB_URL}                    │`);
  console.log('│                                                             │');
  console.log('│  Pré-requisito: supabase start + supabase functions serve   │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('Aguardando requests... (Ctrl+C para encerrar)');
});
