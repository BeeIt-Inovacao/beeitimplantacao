// ============================================================================
// BeeIT OS-RT v2 — Edge Function protheus-proxy (v3.0)
// ----------------------------------------------------------------------------
// Proxy unificado com hardening de segurança (Sprint 3):
//
//   1. CORS allow-list estrita (implantacao.com.br + localhost dev)
//   2. JWT obrigatório — valida assinatura via supabase.auth.getUser
//   3. Path allow-list estrita para /protheus/* (regex fechada)
//   4. Credenciais Protheus resolvidas server-side via tenant_protheus_config
//      + Supabase Vault — NUNCA aceita x-protheus-auth do browser
//   5. Audit log em public.audit_protheus (best-effort)
//
// Roteamento:
//   /protheus/<path-allowed> → Protheus REST (path validado, credenciais injetadas)
//   /ibge/*                  → IBGE localidades
//   /viacep/:cep             → ViaCEP
//   /brasilapi/*             → BrasilAPI
//   /health                  → health check (público, sem auth)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL       = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const IBGE_BASE      = "https://servicodados.ibge.gov.br/api/v1/localidades";
const VIACEP_BASE    = "https://viacep.com.br/ws";
const BRASILAPI_BASE = "https://brasilapi.com.br/api";

// Allow-list de origens (CORS). localhost:* é permitido em dev via regex.
const ORIGIN_EXACT = new Set<string>([
  "https://implantacao.com.br",
]);
const ORIGIN_REGEX = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
];

// Allow-list de paths Protheus (regex estrita).
// Permite:
//   /api/v1/bda/dictionary/<endpoint>     BdaDictApi    (blueprint etc)
//   /api/v1/bda/dynamic                   BDADynApi     (get_arch_blueprint, exec_sql)
//   /api/v1/bda/dynamic/<endpoint>
//   /api/v1/mata4XX[/...]                 rotinas MATA4* (410/415/460 etc)
//   /rest/mata4XX[/...]                   variação /rest/
// Bloqueia: /SIGAADV, /api/admin, /totvs-menu, qualquer rota TOTVS padrão aberta.
const PROTHEUS_PATH_ALLOW = new RegExp(
  "^(" +
    "/api/v1/bda/(dictionary|dynamic)(/[a-z0-9_-]+)*" +
    "|" +
    "/api/v1/mata4\\d{2}(/[a-z0-9_-]+)*" +
    "|" +
    "/rest/mata4\\d{2}(/[a-z0-9_-]+)*" +
  ")$",
  "i"
);

// ─── Helpers ───────────────────────────────────────────────────────────────

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ORIGIN_EXACT.has(origin)) return true;
  return ORIGIN_REGEX.some((re) => re.test(origin));
}

function corsFor(origin: string | null): Record<string, string> {
  const allowed = isOriginAllowed(origin) ? origin! : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(
  origin: string | null,
  payload: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsFor(origin), "Content-Type": "application/json" },
  });
}

function jsonErr(origin: string | null, message: string, status = 500, extra: Record<string, unknown> = {}) {
  return jsonResponse(origin, { error: message, ...extra }, status);
}

// Cliente admin (service_role) — usado para Vault e audit.
function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Autenticação ──────────────────────────────────────────────────────────

interface AuthContext {
  userId: string;
  tenantId: string | null;
  jwt: string;
}

async function authenticate(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  const jwt = authHeader.slice(7);

  // getUser valida a assinatura do JWT contra SUPABASE_JWT_SECRET e retorna o user.
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) return null;

  // Extrai claim customizado tenant_id (já validado indiretamente pela getUser).
  let tenantId: string | null = null;
  try {
    const payloadSeg = jwt.split(".")[1];
    const json = JSON.parse(atob(payloadSeg.replace(/-/g, "+").replace(/_/g, "/")));
    const raw = json.tenant_id ?? json.app_metadata?.tenant_id ?? null;
    tenantId = typeof raw === "string" && raw.length > 0 ? raw : null;
  } catch {
    tenantId = null;
  }

  return { userId: data.user.id, tenantId, jwt };
}

// ─── Resolução de credenciais Protheus via Vault ───────────────────────────

interface ProtheusCredentials {
  url: string;
  basicAuth: string; // já no formato "usuario:senha" codificado em base64
}

async function resolveProtheusCredentials(tenantId: string): Promise<ProtheusCredentials | null> {
  const admin = adminClient();

  const { data: config, error: cfgErr } = await admin
    .from("tenant_protheus_config")
    .select("protheus_url, basic_auth_ref, active")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (cfgErr || !config || !config.active) return null;

  // vault.decrypted_secrets é acessível com service_role.
  // decrypted_secret contém o valor já formatado ("user:pass" base64ed) —
  // convenção: o operador grava no Vault o header "Basic <base64(user:pass)>"
  // ou apenas o base64 da dupla. Aqui assumimos a segunda convenção.
  const { data: secret, error: vErr } = await admin
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", config.basic_auth_ref)
    .maybeSingle();

  if (vErr || !secret?.decrypted_secret) return null;

  return {
    url: String(config.protheus_url).replace(/\/+$/, ""),
    basicAuth: String(secret.decrypted_secret).trim(),
  };
}

// ─── Audit log (best-effort) ───────────────────────────────────────────────

interface AuditEntry {
  userId: string | null;
  tenantId: string | null;
  path: string;
  method: string;
  status: number;
  durationMs: number;
  rejectedReason?: string;
  ip?: string | null;
  userAgent?: string | null;
}

async function audit(entry: AuditEntry): Promise<void> {
  try {
    const admin = adminClient();
    await admin.from("audit_protheus").insert({
      user_id: entry.userId,
      tenant_id: entry.tenantId,
      path: entry.path,
      method: entry.method,
      status: entry.status,
      duration_ms: entry.durationMs,
      rejected_reason: entry.rejectedReason ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch (_err) {
    // best-effort: audit não pode derrubar a request principal.
  }
}

function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

// ─── Proxy genérico (usado por rotas públicas: IBGE, ViaCEP, BrasilAPI) ────

async function proxyPublic(
  origin: string | null,
  target: string,
  req: Request,
): Promise<Response> {
  const body = ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : await req.text();
  const headers: Record<string, string> = {};
  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;
  const accept = req.headers.get("accept");
  if (accept) headers["Accept"] = accept;

  const upstream = await fetch(target, { method: req.method, headers, body });
  const bodyText = await upstream.text();
  const respCT = upstream.headers.get("content-type") || "application/json";

  return new Response(bodyText, {
    status: upstream.status,
    headers: { ...corsFor(origin), "Content-Type": respCT },
  });
}

// ─── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/protheus-proxy/, "")
    .replace(/^\/protheus-proxy/, "") || "/";
  const search = url.search ?? "";

  // Preflight CORS
  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return new Response(null, { status: 403 });
    }
    return new Response("ok", { headers: corsFor(origin) });
  }

  // Bloqueia origens não permitidas já no início (reduz ataque fácil).
  // Health é público e não depende de Origin.
  const isHealth = path === "/" || path === "/health";
  if (!isHealth && origin && !isOriginAllowed(origin)) {
    return jsonErr(null, "Origin não permitida", 403);
  }

  // Health check — não exige autenticação
  if (isHealth) {
    return jsonResponse(origin, {
      service: "BeeIT OS-RT Proxy",
      version: "3.0",
      status: "ok",
      routes: {
        protheus: "/protheus/<allow-listed-path>",
        ibge: "/ibge/*",
        viacep: "/viacep/:cep",
        brasilapi: "/brasilapi/*",
      },
      security: {
        cors: "allow-list",
        auth: "Supabase JWT required",
        credentials: "server-side (Supabase Vault per tenant)",
        path_allow_list: "strict regex on /protheus/*",
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Autenticação obrigatória para tudo além de /health
  const auth = await authenticate(req);
  if (!auth) {
    await audit({
      userId: null,
      tenantId: null,
      path,
      method: req.method,
      status: 401,
      durationMs: Date.now() - startedAt,
      rejectedReason: "missing_or_invalid_jwt",
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
    });
    return jsonErr(origin, "Unauthorized", 401);
  }

  try {
    // ───── Protheus ─────
    if (path.startsWith("/protheus/")) {
      const protheusPath = path.slice("/protheus".length); // começa com "/"

      // Path allow-list estrita
      if (!PROTHEUS_PATH_ALLOW.test(protheusPath)) {
        await audit({
          userId: auth.userId,
          tenantId: auth.tenantId,
          path: protheusPath,
          method: req.method,
          status: 403,
          durationMs: Date.now() - startedAt,
          rejectedReason: "protheus_path_not_allowed",
          ip: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        });
        return jsonErr(origin, "Rota Protheus não permitida", 403, { path: protheusPath });
      }

      // Tenant obrigatório
      if (!auth.tenantId) {
        await audit({
          userId: auth.userId,
          tenantId: null,
          path: protheusPath,
          method: req.method,
          status: 403,
          durationMs: Date.now() - startedAt,
          rejectedReason: "jwt_without_tenant_id",
          ip: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        });
        return jsonErr(origin, "JWT sem claim tenant_id", 403);
      }

      // Resolve credenciais via Vault (nunca do browser)
      const creds = await resolveProtheusCredentials(auth.tenantId);
      if (!creds) {
        await audit({
          userId: auth.userId,
          tenantId: auth.tenantId,
          path: protheusPath,
          method: req.method,
          status: 403,
          durationMs: Date.now() - startedAt,
          rejectedReason: "tenant_config_missing_or_inactive",
          ip: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        });
        return jsonErr(origin, "Tenant sem configuração Protheus ativa", 403);
      }

      const target = `${creds.url}${protheusPath}${search}`;
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();

      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          "Authorization": `Basic ${creds.basicAuth}`,
          "Content-Type": req.headers.get("content-type") || "application/json",
          "Accept": req.headers.get("accept") || "application/json",
        },
        body,
      });
      const bodyText = await upstream.text();
      const respCT = upstream.headers.get("content-type") || "application/json";

      await audit({
        userId: auth.userId,
        tenantId: auth.tenantId,
        path: protheusPath,
        method: req.method,
        status: upstream.status,
        durationMs: Date.now() - startedAt,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent"),
      });

      return new Response(bodyText, {
        status: upstream.status,
        headers: { ...corsFor(origin), "Content-Type": respCT },
      });
    }

    // ───── IBGE ─────
    if (path.startsWith("/ibge/")) {
      const rest = path.slice("/ibge".length);
      return await proxyPublic(origin, `${IBGE_BASE}${rest}${search}`, req);
    }

    // ───── ViaCEP ─────
    if (path.startsWith("/viacep/")) {
      const cep = path.slice("/viacep/".length).replace(/[^0-9]/g, "");
      if (!cep || cep.length !== 8) return jsonErr(origin, "CEP inválido", 400);
      return await proxyPublic(origin, `${VIACEP_BASE}/${cep}/json/`, req);
    }

    // ───── BrasilAPI ─────
    if (path.startsWith("/brasilapi/")) {
      const rest = path.slice("/brasilapi".length);
      return await proxyPublic(origin, `${BRASILAPI_BASE}${rest}${search}`, req);
    }

    return jsonErr(origin, `Rota não encontrada: ${path}`, 404, {
      hint: "Use /protheus/<path>, /ibge/*, /viacep/:cep ou /brasilapi/*",
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await audit({
      userId: auth.userId,
      tenantId: auth.tenantId,
      path,
      method: req.method,
      status: 502,
      durationMs: Date.now() - startedAt,
      rejectedReason: `exception: ${msg.slice(0, 180)}`,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
    });
    return jsonErr(origin, `Proxy error: ${msg}`, 502, { path });
  }
});
