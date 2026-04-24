-- ============================================================================
-- BeeIT OS-RT v2 — audit_protheus
-- ----------------------------------------------------------------------------
-- Log de auditoria de toda chamada à Edge Function protheus-proxy.
-- Inserção exclusiva pelo service_role (Edge Function); leitura pelo próprio
-- usuário ou pelo admin do tenant.
--
-- Essencial para LGPD, detecção de abuso e investigação pós-incidente.
-- ============================================================================

create table public.audit_protheus (
  id            bigserial   primary key,
  user_id       uuid        references auth.users(id)                         on delete set null,
  tenant_id     uuid        references public.tenant_protheus_config(tenant_id) on delete set null,
  path          text        not null,
  method        text        not null,
  status        smallint    not null,
  duration_ms   integer,
  ip            inet,
  user_agent    text,
  rejected_reason text,
  created_at    timestamptz not null default now(),

  constraint audit_protheus_method_enum
    check (method in ('GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD')),
  constraint audit_protheus_status_range
    check (status between 100 and 599)
);

comment on table public.audit_protheus is
  'Log append-only de chamadas à Edge Function protheus-proxy. Inserido pelo service_role; lido por owner ou admin do tenant.';
comment on column public.audit_protheus.rejected_reason is
  'Preenchido quando a requisição foi rejeitada antes do upstream (path não permitido, tenant inativo, etc). NULL em sucessos e falhas upstream.';

-- Índices para queries comuns
create index audit_protheus_user_idx   on public.audit_protheus (user_id, created_at desc);
create index audit_protheus_tenant_idx on public.audit_protheus (tenant_id, created_at desc);
create index audit_protheus_rejected_idx
  on public.audit_protheus (tenant_id, created_at desc)
  where rejected_reason is not null;
create index audit_protheus_errors_idx
  on public.audit_protheus (tenant_id, created_at desc)
  where status >= 400;

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Append-only. INSERT apenas via service_role (Edge Function) — nenhuma
-- policy de INSERT é criada aqui; service_role ignora RLS por natureza.
alter table public.audit_protheus enable row level security;

create policy audit_owner_select on public.audit_protheus
  for select using (
    user_id = auth.uid()
    and tenant_id = public.auth_tenant_id()
  );

create policy audit_admin_select on public.audit_protheus
  for select using (
    tenant_id = public.auth_tenant_id()
    and public.is_tenant_admin(tenant_id)
  );

-- Sem policies de UPDATE/DELETE → bloqueados por RLS (append-only).
