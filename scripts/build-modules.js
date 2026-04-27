#!/usr/bin/env node
// scripts/build-modules.js — Sprint 5.4
// Reads src/core/*.js (sorted), validates syntax with `node --check`,
// injects them as <script> blocks immediately after <head> in
// src/BeeIT-OS-RT-v2.html, and writes the result to public/index.html.
//
// Safety: refuses to run if the injection marker is already present in
// the source HTML (prevents double injection on misconfigured pipelines).
//
// Node 20+, zero external dependencies.
'use strict';

const fs        = require('fs');
const path      = require('path');
const { spawnSync } = require('child_process');

const ROOT     = path.resolve(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'src', 'BeeIT-OS-RT-v2.html');
const OUT_HTML = path.join(ROOT, 'public', 'index.html');
const CORE_DIR = path.join(ROOT, 'src', 'core');
const MARKER   = '<!-- beeit:core-injected -->';

function main() {
  // ── 1. Read source HTML (never modified by this script) ──────────────
  if (!fs.existsSync(SRC_HTML)) {
    console.error('[build-modules] ✗ Não encontrado: ' + SRC_HTML);
    process.exit(1);
  }
  const html = fs.readFileSync(SRC_HTML, 'utf8');

  // ── 2. Guard against double injection ────────────────────────────────
  if (html.includes(MARKER)) {
    console.error('[build-modules] ✗ Marcador de injeção já presente em src/BeeIT-OS-RT-v2.html — dupla injeção recusada.');
    process.exit(1);
  }

  // ── 3. Collect & sort core modules ───────────────────────────────────
  if (!fs.existsSync(CORE_DIR)) {
    console.warn('[build-modules] ⚠ Diretório src/core/ não existe — copiando HTML sem injeção.');
    write(html);
    return;
  }

  const entries = fs.readdirSync(CORE_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (entries.length === 0) {
    console.warn('[build-modules] ⚠ Nenhum .js em src/core/ — copiando HTML sem injeção.');
    write(html);
    return;
  }

  const absFiles = entries.map(f => path.join(CORE_DIR, f));

  // ── 4. Validate syntax of every module with `node --check` ───────────
  for (const file of absFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (res.status !== 0) {
      console.error('[build-modules] ✗ Sintaxe inválida: ' + rel);
      if (res.stderr) process.stderr.write(res.stderr);
      process.exit(1);
    }
    console.log('[build-modules] ✓ syntax OK: ' + rel);
  }

  // ── 5. Build injection block ──────────────────────────────────────────
  const blocks = absFiles.map(file => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    return '<script>\n/* ' + rel + ' */\n' + src + '\n</script>';
  });

  const injection = '\n' + MARKER + '\n' + blocks.join('\n') + '\n';

  // ── 6. Splice immediately after <head> ────────────────────────────────
  const HEAD_TAG = '<head>';
  const headPos  = html.indexOf(HEAD_TAG);
  if (headPos === -1) {
    console.error('[build-modules] ✗ Tag <head> não encontrada em ' + SRC_HTML);
    process.exit(1);
  }
  const insertAt = headPos + HEAD_TAG.length;
  const output   = html.slice(0, insertAt) + injection + html.slice(insertAt);

  // ── 7. Write output ───────────────────────────────────────────────────
  write(output);
  console.log('[build-modules] ✅ ' + entries.length + ' módulo(s) injetado(s) → public/index.html');
}

function write(content) {
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, content, 'utf8');
}

main();
