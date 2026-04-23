#!/usr/bin/env node
/**
 * BeeIT OS-RT v2 — Migrador de URLs do Proxy
 * 
 * Converte todas as referências ao proxy local (localhost:3030)
 * para a Edge Function Supabase (protheus-proxy).
 * 
 * Uso:
 *   node scripts/migrate-proxy-urls.js src/BeeIT-OS-RT-v2.html
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_PROJECT = 'dbaqvoatopfquaqgdptk';
const EDGE_FUNCTION_BASE = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/protheus-proxy`;

// Mapa de substituições
const REPLACEMENTS = [
  // Proxy genérico na porta 3030
  {
    find: /http:\/\/localhost:3030/g,
    replace: EDGE_FUNCTION_BASE,
    desc: 'Proxy local → Edge Function'
  },
  {
    find: /http:\/\/127\.0\.0\.1:3030/g,
    replace: EDGE_FUNCTION_BASE,
    desc: 'Proxy local (127.0.0.1) → Edge Function'
  },
  // URLs diretas do Protheus (se algum código tentava bypass)
  {
    find: /http:\/\/beeit207327\.protheus\.cloudtotvs\.com\.br:10607/g,
    replace: `${EDGE_FUNCTION_BASE}/protheus`,
    desc: 'Protheus direto → Edge Function /protheus'
  },
  // Endpoints específicos do proxy local
  {
    find: new RegExp(`${EDGE_FUNCTION_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/ibge/`, 'g'),
    replace: `${EDGE_FUNCTION_BASE}/ibge/`,
    desc: 'Normalização IBGE'
  },
];

function migrate(inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Arquivo não encontrado: ${inputPath}`);
    process.exit(1);
  }

  console.log(`📄 Lendo ${inputPath}...`);
  let content = fs.readFileSync(inputPath, 'utf8');
  const originalLength = content.length;

  // Backup
  const backupPath = inputPath + '.bak';
  fs.writeFileSync(backupPath, content);
  console.log(`💾 Backup criado: ${backupPath}`);

  let totalChanges = 0;
  REPLACEMENTS.forEach(({ find, replace, desc }) => {
    const matches = content.match(find);
    if (matches && matches.length > 0) {
      content = content.replace(find, replace);
      console.log(`  ✅ ${matches.length}x — ${desc}`);
      totalChanges += matches.length;
    }
  });

  // Adicionar header automático de Authorization Supabase JWT
  // (a Edge Function exige verify_jwt=true)
  const authHeaderCheck = /x-protheus-auth|SUPABASE_ANON_KEY/;
  if (!authHeaderCheck.test(content)) {
    console.warn('⚠️  ATENÇÃO: o código não parece enviar Authorization header.');
    console.warn('    A Edge Function exige JWT Supabase. Revise manualmente.');
  }

  fs.writeFileSync(inputPath, content);
  console.log('');
  console.log(`✨ ${totalChanges} substituições aplicadas em ${inputPath}`);
  console.log(`📏 Tamanho: ${originalLength} → ${content.length} bytes`);
  console.log('');
  console.log('📋 Próximos passos:');
  console.log('  1. Revisar o arquivo — buscar por "localhost" ou "3030" residuais');
  console.log('  2. Garantir que todas as chamadas fetch() enviam:');
  console.log('     headers: { "Authorization": `Bearer ${beeitSession.access_token}` }');
  console.log('  3. Testar em dev antes do commit');
}

// Entry point
const input = process.argv[2];
if (!input) {
  console.log('Uso: node scripts/migrate-proxy-urls.js <arquivo.html>');
  console.log('Exemplo: node scripts/migrate-proxy-urls.js src/BeeIT-OS-RT-v2.html');
  process.exit(0);
}

migrate(path.resolve(input));
