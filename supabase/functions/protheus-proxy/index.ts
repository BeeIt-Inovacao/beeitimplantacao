// BeeIT OS-RT v2 — Proxy unificado (substitui o Node.js porta 3030)
// Roteamento:
//   /protheus/*      → http://beeit207327.protheus.cloudtotvs.com.br:10607/*
//   /ibge/*          → https://servicodados.ibge.gov.br/api/v1/localidades/*
//   /viacep/:cep     → https://viacep.com.br/ws/:cep/json/
//   /brasilapi/*     → https://brasilapi.com.br/api/*
//   /clicksign/*     → https://app.clicksign.com/*  (contorna CORS da API ClickSign)
//   /clicksign-sandbox/* → https://sandbox.clicksign.com/*

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROTHEUS_BASE   = Deno.env.get('PROTHEUS_BASE_URL') || 'http://beeit207327.protheus.cloudtotvs.com.br:10607';
const IBGE_BASE       = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const VIACEP_BASE     = 'https://viacep.com.br/ws';
const BRASILAPI_BASE  = 'https://brasilapi.com.br/api';
const CLICKSIGN_BASE  = 'https://app.clicksign.com';
const CLICKSIGN_SBOX  = 'https://sandbox.clicksign.com';

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

    // ───── Health check ─────
    if (path === '/' || path === '/health' || path === '') {
      return new Response(JSON.stringify({
        service: 'BeeIT OS-RT Proxy',
        version: '2.1',
        status: 'ok',
        routes: ['/protheus/*', '/ibge/*', '/viacep/:cep', '/brasilapi/*', '/clicksign/*', '/clicksign-sandbox/*'],
        timestamp: new Date().toISOString(),
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return jsonErr(`Rota não encontrada: ${path}`, 404, { hint: 'Use /protheus/*, /ibge/*, /viacep/:cep, /brasilapi/*, /clicksign/* ou /clicksign-sandbox/*' });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonErr(`Proxy error: ${msg}`, 502, { path, search });
  }
});
