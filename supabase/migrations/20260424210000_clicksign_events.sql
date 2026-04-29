-- BeeIT OS-RT v2 — Tabela de auditoria de webhooks ClickSign
-- Cada evento recebido em /clicksign-webhook é registrado aqui.

create table if not exists public.clicksign_events (
  id            uuid primary key default gen_random_uuid(),
  event_name    text not null,
  document_key  text,
  signer_key    text,
  occurred_at   timestamptz,
  received_at   timestamptz not null default now(),
  hmac_valid    boolean not null default false,
  payload       jsonb not null,
  source_ip     text
);

create index if not exists clicksign_events_document_key_idx
  on public.clicksign_events (document_key);

create index if not exists clicksign_events_event_name_idx
  on public.clicksign_events (event_name);

create index if not exists clicksign_events_received_at_idx
  on public.clicksign_events (received_at desc);

alter table public.clicksign_events enable row level security;

-- Service Role bypassa RLS por padrão (usado pela Edge Function pra INSERT).
-- Usuários autenticados do BeeIT podem LER para exibir histórico no app.
drop policy if exists "authenticated read clicksign events" on public.clicksign_events;
create policy "authenticated read clicksign events"
  on public.clicksign_events
  for select
  to authenticated
  using (true);

comment on table  public.clicksign_events is 'Eventos recebidos via webhook ClickSign (protheus-proxy/clicksign-webhook)';
comment on column public.clicksign_events.hmac_valid   is 'TRUE quando a assinatura HMAC-SHA256 bateu; FALSE apenas quando o secret não está configurado';
comment on column public.clicksign_events.payload      is 'Body JSON integral recebido do ClickSign';
