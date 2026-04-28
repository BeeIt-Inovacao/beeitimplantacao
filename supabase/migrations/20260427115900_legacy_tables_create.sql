-- ============================================================================
-- BeeIT OS-RT v2 — Tabelas legadas do monólito
-- ----------------------------------------------------------------------------
-- Cria as 4 tabelas que existem em produção desde antes da modularização SaaS
-- mas não tinham migration. Necessárias para que a próxima migration
-- (20260427120000_enable_rls_legacy_tables) possa ativar RLS nelas.
--
-- profiles    — perfil do usuário (nome, role, ativo)
-- access_log  — log de ações dos usuários
-- clientes    — legado do monólito (não exposta via REST no frontend atual)
-- documentos  — legado do monólito (não exposta via REST no frontend atual)
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ profiles                                                                 │
-- └──────────────────────────────────────────────────────────────────────────┘

create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  nome       text,
  email      text,
  role       text        not null default 'consultor'
                          check (role in ('admin','consultor','visualizador','importador')),
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil do usuário BeeIT (nome, role, ativo). Espelha auth.users com dados de negócio.';

-- updated_at automático
create or replace function public.profiles_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger
    where tgname='profiles_updated_at' and tgrelid='public.profiles'::regclass)
  then
    create trigger profiles_updated_at
      before update on public.profiles
      for each row execute function public.profiles_set_updated_at();
  end if;
end $$;

-- Trigger: cria profile automaticamente quando um usuário é cadastrado
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, nome, role, ativo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'consultor'),
    true
  ) on conflict (id) do nothing;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger
    where tgname='on_auth_user_created' and tgrelid='auth.users'::regclass)
  then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- Cria profile do admin local se já existir em auth.users
insert into public.profiles (id, email, nome, role, ativo)
select id, email,
       coalesce(raw_user_meta_data->>'nome', split_part(email,'@',1)),
       'admin', true
from auth.users
where email = 'admin@beeit.com.br'
on conflict (id) do nothing;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ access_log                                                               │
-- └──────────────────────────────────────────────────────────────────────────┘

create table if not exists public.access_log (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete set null,
  acao       text,
  detalhe    text,
  created_at timestamptz not null default now()
);

comment on table public.access_log is
  'Log de ações dos usuários BeeIT (login, sync Protheus, etc.).';

create index if not exists access_log_user_created_idx
  on public.access_log (user_id, created_at desc);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ clientes (legado monólito)                                               │
-- └──────────────────────────────────────────────────────────────────────────┘

create table if not exists public.clientes (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid,
  dados      jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clientes is
  'Tabela legada do monólito — cache de clientes SA1 importados via SPED.';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ documentos (legado monólito)                                             │
-- └──────────────────────────────────────────────────────────────────────────┘

create table if not exists public.documentos (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid,
  tipo       text,
  dados      jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.documentos is
  'Tabela legada do monólito — documentos ClickSign e importações.';

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ RLS — profiles, access_log                                              │
-- │ (clientes e documentos têm RLS ativada pela next migration)             │
-- └──────────────────────────────────────────────────────────────────────────┘

-- profiles: usuário lê/edita só o próprio; admin lê tudo
alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;

create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_select on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- access_log: qualquer usuário pode inserir o próprio; admin lê tudo
alter table public.access_log enable row level security;

drop policy if exists access_log_insert on public.access_log;
drop policy if exists access_log_admin_select on public.access_log;

create policy access_log_insert on public.access_log
  for insert with check (user_id = auth.uid());

create policy access_log_admin_select on public.access_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
