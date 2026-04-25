// BeeIT OS-RT v2 — Proxy unificado (substitui o Node.js porta 3030)
// Roteamento:
//   /protheus/*          → http://beeit207327.protheus.cloudtotvs.com.br:10607/*
//   /ibge/*              → https://servicodados.ibge.gov.br/api/v1/localidades/*
//   /viacep/:cep         → https://viacep.com.br/ws/:cep/json/
//   /brasilapi/*         → https://brasilapi.com.br/api/*
//   /clicksign/*         → https://app.clicksign.com/*  (contorna CORS da API ClickSign)
//   /clicksign-sandbox/* → https://sandbox.clicksign.com/*
//   /clicksign-webhook   → recebe eventos do ClickSign (HMAC-SHA256 validation)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROTHEUS_BASE   = Deno.env.get('PROTHEUS_BASE_URL') || 'http://beeit207327.protheus.cloudtotvs.com.br:10607';
const IBGE_BASE       = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const VIACEP_BASE     = 'https://viacep.com.br/ws';
const BRASILAPI_BASE  = 'https://brasilapi.com.br/api';
const CLICKSIGN_BASE  = 'https://app.clicksign.com';
const CLICKSIGN_SBOX  = 'https://sandbox.clicksign.com';
const CLICKSIGN_HMAC  = Deno.env.get('CLICKSIGN_HMAC_SECRET') || '';
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-protheus-auth, x-protheus-empresa, x-protheus-filial',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonErr(msg: string, status = 500, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: msg, ...extra }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function toHex(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < u8.length; i++) out += u8[i].toString(16).padStart(2, '0');
  return out;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function persistClicksignEvent(row: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.warn('[clicksign-webhook] SUPABASE_URL/SERVICE_ROLE_KEY ausentes — evento não persistido');
    return;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/clicksign_events`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      console.error('[clicksign-webhook] insert falhou:', r.status, await r.text());
    }
  } catch (e) {
    console.error('[clicksign-webhook] persist error:', e instanceof Error ? e.message : String(e));
  }
}

async function proxyRequest(target: string, req: Request, extraHeaders: Record<string, string> = {}) {
  const method = req.method;
  const headers: Record<string, string> = { ...extraHeaders };
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;
  const accept = req.headers.get('accept');
  if (accept) headers['Accept'] = accept;

  const body = (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') ? undefined : await req.text();

  const upstream = await fetch(target, { method, headers, body });
  const respBody = await upstream.text();
  const respCT = upstream.headers.get('content-type') || 'application/json';

  return new Response(respBody, {
    status: upstream.status,
    headers: { ...CORS, 'Content-Type': respCT },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/protheus-proxy/, '').replace(/^\/protheus-proxy/, '') || '/';
  const search = url.search || '';

  try {
    // ───── PROTHEUS (REST API) ─────
    if (path.startsWith('/protheus/')) {
      const rest = path.substring('/protheus'.length);
      const target = `${PROTHEUS_BASE}${rest}${search}`;
      const protheusAuth = req.headers.get('x-protheus-auth') || '';
      const headers: Record<string, string> = {};
      if (protheusAuth) headers['Authorization'] = protheusAuth;
      return await proxyRequest(target, req, headers);
    }

    // ───── IBGE ─────
    if (path.startsWith('/ibge/')) {
      const rest = path.substring('/ibge'.length);
      const target = `${IBGE_BASE}${rest}${search}`;
      return await proxyRequest(target, req);
    }

    // ───── ViaCEP ─────
    if (path.startsWith('/viacep/')) {
      const cep = path.substring('/viacep/'.length).replace(/[^0-9]/g, '');
      if (!cep || cep.length !== 8) return jsonErr('CEP inválido', 400);
      const target = `${VIACEP_BASE}/${cep}/json/`;
      return await proxyRequest(target, req);
    }

    // ───── BrasilAPI ─────
    if (path.startsWith('/brasilapi/')) {
      const rest = path.substring('/brasilapi'.length);
      const target = `${BRASILAPI_BASE}${rest}${search}`;
      return await proxyRequest(target, req);
    }

    // ───── ClickSign (produção) — contorna CORS ─────
    // Uso: /clicksign/api/v1/documents?access_token=XXX  →  https://app.clicksign.com/api/v1/documents?access_token=XXX
    if (path.startsWith('/clicksign/')) {
      const rest = path.substring('/clicksign'.length);
      const target = `${CLICKSIGN_BASE}${rest}${search}`;
      return await proxyRequest(target, req);
    }

    // ───── ClickSign (sandbox) ─────
    if (path.startsWith('/clicksign-sandbox/')) {
      const rest = path.substring('/clicksign-sandbox'.length);
      const target = `${CLICKSIGN_SBOX}${rest}${search}`;
      return await proxyRequest(target, req);
    }

    // ───── ClickSign Webhook (receptor de eventos) ─────
    // Config no painel ClickSign → Configurações → Webhooks
    //   URL:  https://<project>.supabase.co/functions/v1/protheus-proxy/clicksign-webhook
    //   HMAC: (mesmo valor salvo no secret CLICKSIGN_HMAC_SECRET)
    if (path === '/clicksign-webhook' || path === '/clicksign-webhook/') {
      if (req.method !== 'POST') {
        return jsonErr('Method not allowed', 405, { allowed: 'POST' });
      }

      const rawBody = await req.text();
      const sigHeader = req.headers.get('content-hmac') || req.headers.get('x-clicksign-hmac') || '';
      let hmacValid = false;

      if (CLICKSIGN_HMAC) {
        const hex = await hmacSha256Hex(CLICKSIGN_HMAC, rawBody);
        const expected = `sha256=${hex}`;
        hmacValid = timingSafeEqual(sigHeader, expected);
        if (!hmacValid) {
          console.error('[clicksign-webhook] HMAC inválido');
          return jsonErr('Invalid signature', 401);
        }
      } else {
        console.warn('[clicksign-webhook] CLICKSIGN_HMAC_SECRET não configurado — pulando validação');
      }

      let evt: Record<string, unknown> = {};
      try { evt = JSON.parse(rawBody); } catch { /* keep 200 mesmo sem JSON */ }

      const ev = evt as {
        event?:    { name?: string; occurred_at?: string };
        document?: { key?: string };
        signer?:   { key?: string };
      };
      const eventName  = ev.event?.name        || 'unknown';
      const docKey     = ev.document?.key      || null;
      const signerKey  = ev.signer?.key        || null;
      const occurredAt = ev.event?.occurred_at || null;
      const sourceIp   = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;

      console.log(`[clicksign-webhook] ${eventName} doc=${docKey || '-'}`);

      await persistClicksignEvent({
        event_name:   eventName,
        document_key: docKey,
        signer_key:   signerKey,
        occurred_at:  occurredAt,
        hmac_valid:   hmacValid,
        payload:      evt,
        source_ip:    sourceIp,
      });

      return new Response(JSON.stringify({ ok: true, received: eventName }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ───── Health check ─────
    if (path === '/' || path === '/health' || path === '') {
      return new Response(JSON.stringify({
        service: 'BeeIT OS-RT Proxy',
        version: '2.2',
        status: 'ok',
        routes: ['/protheus/*', '/ibge/*', '/viacep/:cep', '/brasilapi/*', '/clicksign/*', '/clicksign-sandbox/*', '/clicksign-webhook'],
        timestamp: new Date().toISOString(),
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return jsonErr(`Rota não encontrada: ${path}`, 404, { hint: 'Use /protheus/*, /ibge/*, /viacep/:cep, /brasilapi/*, /clicksign/*, /clicksign-sandbox/* ou /clicksign-webhook' });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonErr(`Proxy error: ${msg}`, 502, { path, search });
  }
});
