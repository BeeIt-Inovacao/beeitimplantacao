#!/usr/bin/env node
/**
 * BeeIT OS-RT v2 — setup-tenant.js
 *
 * Provisiona um tenant no Supabase atomicamente (via RPC
 * public.provision_tenant_protheus):
 *   1. INSERT em tenant_protheus_config
 *   2. vault.create_secret com o Basic Auth do Protheus (base64)
 *   3. UPDATE basic_auth_ref apontando para o secret
 *   4. (Opcional) Vincula um usuário existente como admin
 *
 * ZERO DEPENDÊNCIAS — usa apenas Node 20+ (fetch + --env-file nativos).
 *
 * Uso mínimo (interativo):
 *   node --env-file=.env scripts/setup-tenant.js
 *
 * Uso completo (flags):
 *   node --env-file=.env scripts/setup-tenant.js \
 *     --display-name "BeeIt Partner" \
 *     --url "http://beeit207327.protheus.cloudtotvs.com.br:10607" \
 *     --env P12 --company 01 --filial 0101 \
 *     --protheus-user admin --protheus-pass '***' \
 *     --admin-email admin@beeit.com.br
 *
 * Flags:
 *   --display-name <text>    Nome amigável do tenant
 *   --url <url>              URL base do Protheus REST
 *   --env <env>              Ambiente Protheus (ex: P12)
 *   --company <cod>          Empresa Protheus (ex: 01)
 *   --filial <cod>           Filial Protheus (ex: 0101)
 *   --protheus-user <user>   Usuário Protheus (REST)
 *   --protheus-pass <pass>   Senha Protheus (REST)
 *   --admin-email <email>    Email de um user Supabase existente p/ vincular como admin
 *   --list                   Apenas lista tenants já provisionados
 *   --dry-run                Valida inputs e mostra o payload sem chamar o Supabase
 *   --help                   Mostra esta ajuda
 *
 * Variáveis de ambiente obrigatórias (via --env-file=.env):
 *   SUPABASE_URL                 https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service_role key (!!! bypassa RLS — nunca commit)
 */

'use strict';

const { parseArgs } = require('node:util');
const readline = require('node:readline/promises');

// ── CLI args ─────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    'display-name':  { type: 'string' },
    'url':           { type: 'string' },
    'env':           { type: 'string' },
    'company':       { type: 'string' },
    'filial':        { type: 'string' },
    'protheus-user': { type: 'string' },
    'protheus-pass': { type: 'string' },
    'admin-email':   { type: 'string' },
    'list':          { type: 'boolean', default: false },
    'dry-run':       { type: 'boolean', default: false },
    'help':          { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

function printHelp() {
  const text = require('node:fs').readFileSync(__filename, 'utf8');
  const header = text.split('\n').slice(0, 45).join('\n').replace(/^ *\*\/?.*$/gm, l => l.replace(/^ *\*\/? ?/, ''));
  console.log(header);
}

if (args.help) { printHelp(); process.exit(0); }

// ── Validação env ────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Variáveis obrigatórias ausentes: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  console.error('   Crie um arquivo .env (veja .env.example) e rode com:');
  console.error('     node --env-file=.env scripts/setup-tenant.js');
  process.exit(1);
}

// ── Helpers HTTP (PostgREST) ─────────────────────────────────────────
async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  if (!res.ok) {
    const msg = parsed?.message || parsed?.error || text || `HTTP ${res.status}`;
    throw new Error(`RPC ${fn} falhou (${res.status}): ${msg}`);
  }
  return parsed;
}

async function promptMissing() {
  if (args['display-name'] && args['url'] && args['env'] && args['company']
      && args['filial'] && args['protheus-user'] && args['protheus-pass']) {
    return;
  }

  console.log('ℹ️  Modo interativo — preencha os campos ausentes (Enter usa o default entre colchetes):\n');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label, def, mask = false) => {
    const tag = def ? ` [${mask ? '***' : def}]` : '';
    const raw = (await rl.question(`${label}${tag}: `)).trim();
    return raw || def || '';
  };

  args['display-name']  ||= await ask('Display name do tenant');
  args['url']           ||= await ask('URL Protheus (http://host:porta)');
  args['env']           ||= await ask('Environment', 'P12');
  args['company']       ||= await ask('Empresa', '01');
  args['filial']        ||= await ask('Filial', '0101');
  args['protheus-user'] ||= await ask('Usuário Protheus');
  args['protheus-pass'] ||= await ask('Senha Protheus', null, true);
  args['admin-email']   ||= await ask('Email do admin (opcional, Enter para pular)');

  rl.close();
}

function validate(a) {
  const errs = [];
  if (!a['display-name']) errs.push('display-name obrigatório');
  if (!a['url'] || !/^https?:\/\//i.test(a['url'])) errs.push('url deve começar com http(s)://');
  if (!a['env'])     errs.push('env obrigatório');
  if (!a['company']) errs.push('company obrigatório');
  if (!a['filial'])  errs.push('filial obrigatório');
  if (!a['protheus-user']) errs.push('protheus-user obrigatório');
  if (!a['protheus-pass']) errs.push('protheus-pass obrigatório');
  if (a['admin-email'] && !/.+@.+\..+/.test(a['admin-email'])) errs.push('admin-email inválido');
  return errs;
}

async function cmdList() {
  console.log('📋 Tenants provisionados:\n');
  const rows = await rpc('list_provisioned_tenants', {});
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('   (nenhum tenant encontrado)');
    return;
  }
  const w = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  console.log(w('tenant_id', 38) + w('display_name', 24) + w('active', 7) + w('admins', 7) + 'url');
  console.log('─'.repeat(110));
  for (const r of rows) {
    console.log(
      w(r.tenant_id, 38) + w(r.display_name, 24) + w(r.active ? 'yes' : 'no', 7)
      + w(r.admin_count, 7) + (r.protheus_url || '')
    );
  }
}

async function cmdProvision() {
  await promptMissing();
  const errs = validate(args);
  if (errs.length) {
    console.error('❌ Erros de input:');
    errs.forEach(e => console.error(`   • ${e}`));
    process.exit(1);
  }

  const basicAuthB64 = Buffer.from(`${args['protheus-user']}:${args['protheus-pass']}`, 'utf8').toString('base64');

  const payload = {
    p_display_name:     args['display-name'],
    p_protheus_url:     args['url'],
    p_protheus_env:     args['env'],
    p_protheus_company: args['company'],
    p_protheus_filial:  args['filial'],
    p_basic_auth_b64:   basicAuthB64,
    p_admin_email:      args['admin-email'] || null,
  };

  if (args['dry-run']) {
    console.log('🧪 DRY RUN — payload que seria enviado:');
    console.log(JSON.stringify({ ...payload, p_basic_auth_b64: '<base64 truncado>' }, null, 2));
    console.log('\n(sem chamar o Supabase)');
    return;
  }

  console.log('🚀 Chamando provision_tenant_protheus...');
  const tenantId = await rpc('provision_tenant_protheus', payload);

  console.log('\n✅ Tenant provisionado com sucesso.');
  console.log(`   tenant_id    : ${tenantId}`);
  console.log(`   display_name : ${args['display-name']}`);
  console.log(`   protheus_url : ${args['url']}`);
  console.log(`   vault_secret : tenant_${String(tenantId).replace(/-/g, '')}_protheus_basicauth`);
  if (args['admin-email']) {
    console.log(`   admin        : ${args['admin-email']}`);
  }
  console.log('\n📌 Próximos passos:');
  console.log('   1. Peça aos usuários vinculados para fazer logout + login (força emissão de');
  console.log('      novo JWT com claim tenant_id via Auth Hook).');
  console.log('   2. Teste health: curl <SUPABASE_URL>/functions/v1/protheus-proxy/health');
  console.log('   3. Teste blueprint com um JWT válido do usuário vinculado.');
}

// ── Entry point ──────────────────────────────────────────────────────
(async () => {
  try {
    if (args['list']) {
      await cmdList();
    } else {
      await cmdProvision();
    }
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
})();
