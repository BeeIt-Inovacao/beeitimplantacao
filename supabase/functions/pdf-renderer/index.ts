// BeeIT OS-RT v2 — Renderizador HTML → PDF via PDFShift (Chrome real headless)
// Uso: POST /functions/v1/pdf-renderer  body: { html, format?, margin?, landscape? }
// Retorna: { ok, pdf_b64, size }
//
// Setup: registrar secret PDFSHIFT_API_KEY no Supabase
//   npx supabase secrets set PDFSHIFT_API_KEY=sk_xxxxx --project-ref dbaqvoatopfquaqgdptk

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PDFSHIFT_API_KEY = Deno.env.get('PDFSHIFT_API_KEY') || '';
const PDFSHIFT_URL = 'https://api.pdfshift.io/v3/convert/pdf';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonRes(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function bufToB64(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, Math.min(i + CHUNK, u8.length))));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return jsonRes({ error: 'Method not allowed', allowed: 'POST' }, 405);
  }
  if (!PDFSHIFT_API_KEY) {
    return jsonRes({ error: 'PDFSHIFT_API_KEY não configurado no Supabase' }, 500);
  }

  let body: { html?: string; format?: string; margin?: string; landscape?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Body JSON inválido' }, 400);
  }

  const html = body.html;
  if (!html || typeof html !== 'string' || html.length < 50) {
    return jsonRes({ error: 'Campo "html" obrigatório (string com pelo menos 50 chars)' }, 400);
  }

  try {
    const pdfshiftRes = await fetch(PDFSHIFT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('api:' + PDFSHIFT_API_KEY),
      },
      body: JSON.stringify({
        source: html,
        format: body.format || 'A4',
        margin: body.margin || '10mm',
        landscape: body.landscape || false,
        delay: 1500,           // espera fonts/imgs base64 carregarem
        use_print: false,
        sandbox: false,
      }),
    });

    if (!pdfshiftRes.ok) {
      const errText = await pdfshiftRes.text();
      console.error('[pdf-renderer] PDFShift falhou:', pdfshiftRes.status, errText);
      return jsonRes({
        error: 'PDFShift retornou erro',
        upstream_status: pdfshiftRes.status,
        upstream_body: errText.substring(0, 500),
      }, 502);
    }

    const pdfBuf = await pdfshiftRes.arrayBuffer();
    if (pdfBuf.byteLength < 500) {
      return jsonRes({ error: 'PDFShift devolveu PDF vazio', size: pdfBuf.byteLength }, 502);
    }

    const pdf_b64 = bufToB64(pdfBuf);
    console.log(`[pdf-renderer] OK ${pdfBuf.byteLength} bytes`);
    return jsonRes({ ok: true, pdf_b64, size: pdfBuf.byteLength });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[pdf-renderer] erro:', msg);
    return jsonRes({ error: 'Erro interno', detail: msg }, 500);
  }
});
