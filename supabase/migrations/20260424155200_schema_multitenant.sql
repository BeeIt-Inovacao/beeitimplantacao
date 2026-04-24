-- ============================================================================
-- BeeIT OS-RT v2 — Schema multi-tenant + Snapshot de Dicionário
-- ----------------------------------------------------------------------------
-- Cria as 4 tabelas do modelo e suas policies RLS na ordem topológica correta:
--
--   1. tenant_protheus_config    (config Protheus por tenant)
--   2. user_tenant               (vínculo N:N user × tenant + role)
--   3. RLS de tenant_protheus_config (depende de user_tenant)
--   4. protheus_dict_snapshot    (snapshot SX2/SX3 por tenant+user+alias)
--   5. protheus_dict_history     (append-only log de diffs)
--
-- Depende de: 20260424155100_helpers_auth.sql
-- ============================================================================


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 1. tenant_protheus_config                                                │
-- │    Configuração Protheus por tenant. URL e referência à credencial       │
-- │    (Supabase Vault) nunca saem do servidor — consumidas apenas pela      │
-- │    Edge Function protheus-proxy.                                         │
-- └──────────────────────────────────────────────────────────────────────────┘

create table public.tenant_protheus_config (
  tenant_id         uuid        primary key default gen_random_uuid(),
  display_name      text        not null,
  protheus_url      text        not null,
  protheus_env      text        not null,
  protheus_company  text        not null,
  protheus_filial   text        not null,
  basic_auth_ref    text        not null,
  active            boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint tenant_protheus_config_url_format
    check (protheus_url ~* '^https?://[a-z0-9.\-_:/]+$'),
  constraint tenant_protheus_config_empresa_len
    check (char_length(protheus_company) between 1 and 4),
  constraint tenant_protheus_config_filial_len
    check (char_length(protheus_filial) between 1 and 8)
);

comment on table public.tenant_protheus_config is
  'Configuração Protheus por tenant. basic_auth_ref aponta para secret no Supabase Vault (nunca senha crua).';
comment on column public.tenant_protheus_config.basic_auth_ref is
  'Nome do secret no Supabase Vault contendo Basic Auth do Protheus deste tenant.';
comment on column public.tenant_protheus_config.active is
  'Permite soft-disable de um tenant sem remover histórico.';

create trigger tenant_protheus_config_set_updated_at
  before update on public.tenant_protheus_config
  for each row execute function public.set_updated_at();

create index tenant_protheus_config_active_idx
  on public.tenant_protheus_config (active)
  where active = true;

-- RLS será habilitado após a criação de user_tenant (abaixo).


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 2. user_tenant                                                           │
-- │    Vínculo N:N entre usuários Supabase e tenants. Fonte do Auth Hook     │
-- │    que injeta tenant_id no JWT claim.                                    │
-- └──────────────────────────────────────────────────────────────────────────┘

create table public.user_tenant (
  user_id     uuid        not null references auth.users(id)                         on delete cascade,
  tenant_id   uuid        not null references public.tenant_protheus_config(tenant_id) on delete cascade,
  role        text        not null check (role in ('admin','operator','viewer')),
  created_at  timestamptz not null default now(),

  primary key (user_id, tenant_id)
);

comment on table public.user_tenant is
  'Vínculo usuário × tenant com papel. Admin gerencia config e convida usuários; operator/viewer consomem módulos.';

create index user_tenant_tenant_idx on public.user_tenant (tenant_id);
create index user_tenant_role_idx   on public.user_tenant (tenant_id, role);

alter table public.user_tenant enable row level security;

create policy user_tenant_self_select on public.user_tenant
  for select using (user_id = auth.uid());

-- is_tenant_admin é SECURITY DEFINER → bypassa RLS internamente, evitando
-- recursão quando a policy de user_tenant consultaria user_tenant.
create policy user_tenant_admin_select_all on public.user_tenant
  for select using (public.is_tenant_admin(tenant_id));

create policy user_tenant_admin_manage on public.user_tenant
  for all using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 3. RLS de tenant_protheus_config (depende de user_tenant)                │
-- │    Apenas administradores do tenant (role='admin') veem/gerenciam.       │
-- └──────────────────────────────────────────────────────────────────────────┘

alter table public.tenant_protheus_config enable row level security;

create policy tpc_admin_select on public.tenant_protheus_config
  for select using (public.is_tenant_admin(tenant_id));

create policy tpc_admin_all on public.tenant_protheus_config
  for all using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 4. protheus_dict_snapshot                                                │
-- │    Snapshot do dicionário SX2/SX3 por (tenant, user, alias).             │
-- │    Fonte da lógica de "Diff de Dicionário" exibida na UI.                │
-- └──────────────────────────────────────────────────────────────────────────┘

create table public.protheus_dict_snapshot (
  tenant_id      uuid        not null references public.tenant_protheus_config(tenant_id) on delete cascade,
  user_id        uuid        not null references auth.users(id)                           on delete cascade,
  sx2_alias      char(3)     not null,
  rotina_padrao  text,
  arquitetura    text        check (arquitetura in ('MVC','ExecAuto')),
  chave_unica    text,
  scope          text        not null default 'MANDATORY_AND_KEYS'
                              check (scope in ('MANDATORY_AND_KEYS','ALL_USED')),
  campos         jsonb       not null,
  campos_hash    text        not null,
  captured_at    timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  primary key (tenant_id, user_id, sx2_alias),

  constraint protheus_dict_snapshot_alias_upper
    check (sx2_alias = upper(sx2_alias)),
  constraint protheus_dict_snapshot_campos_is_array
    check (jsonb_typeof(campos) = 'array'),
  constraint protheus_dict_snapshot_hash_len
    check (char_length(campos_hash) = 64)
);

comment on table public.protheus_dict_snapshot is
  'Snapshot do dicionário Protheus por (tenant, user, alias). PK composta (tenant_id, user_id, sx2_alias).';
comment on column public.protheus_dict_snapshot.campos is
  'Array jsonb bruto da BdaDictApi: cada item {campo,titulo,tipo,tamanho,decimal,obrigat,is_key,is_custom,f3?,combo?}.';
comment on column public.protheus_dict_snapshot.campos_hash is
  'SHA-256 hex (64 chars) do campos canonicalizado (chaves ordenadas).';

create trigger protheus_dict_snapshot_set_updated_at
  before update on public.protheus_dict_snapshot
  for each row execute function public.set_updated_at();

create index protheus_dict_snapshot_tenant_alias_idx
  on public.protheus_dict_snapshot (tenant_id, sx2_alias);

create index protheus_dict_snapshot_captured_at_idx
  on public.protheus_dict_snapshot (tenant_id, captured_at desc);

alter table public.protheus_dict_snapshot enable row level security;

create policy snap_owner_select on public.protheus_dict_snapshot
  for select using (
    user_id = auth.uid()
    and tenant_id = public.auth_tenant_id()
    and public.user_belongs_to_tenant(tenant_id)
  );

create policy snap_owner_modify on public.protheus_dict_snapshot
  for all using (
    user_id = auth.uid()
    and tenant_id = public.auth_tenant_id()
    and public.user_belongs_to_tenant(tenant_id)
  )
  with check (
    user_id = auth.uid()
    and tenant_id = public.auth_tenant_id()
    and public.user_belongs_to_tenant(tenant_id)
  );


-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ 5. protheus_dict_history                                                 │
-- │    Append-only log de diffs do dicionário. Uma linha por evento.         │
-- └──────────────────────────────────────────────────────────────────────────┘

create table public.protheus_dict_history (
  id           bigserial   primary key,
  tenant_id    uuid        not null references public.tenant_protheus_config(tenant_id) on delete cascade,
  user_id      uuid        not null references auth.users(id)                           on delete cascade,
  sx2_alias    char(3)     not null,
  diff         jsonb       not null,
  severity     text        not null check (severity in ('breaking','warning','info')),
  source       text        not null default 'auto'
                            check (source in ('auto','manual','scheduled')),
  detected_at  timestamptz not null default now(),

  constraint protheus_dict_history_alias_upper
    check (sx2_alias = upper(sx2_alias)),
  constraint protheus_dict_history_diff_shape
    check (
      jsonb_typeof(diff) = 'object'
      and diff ? 'added'
      and diff ? 'removed'
      and diff ? 'modified'
    )
);

comment on table public.protheus_dict_history is
  'Append-only log de diffs do dicionário. Uma linha por evento detectado ou aceito.';
comment on column public.protheus_dict_history.diff is
  'Objeto jsonb: {added:[], removed:[], modified:[{campo, antes, depois, atributos_alterados}]}.';
comment on column public.protheus_dict_history.severity is
  'breaking: tipo mudou / tamanho reduzido / is_key removido. warning: tamanho aumentou / obrigat virou true / f3-combo mudou. info: novo opcional / título.';

create index protheus_dict_history_tenant_alias_idx
  on public.protheus_dict_history (tenant_id, sx2_alias, detected_at desc);

create index protheus_dict_history_breaking_idx
  on public.protheus_dict_history (tenant_id, detected_at desc)
  where severity = 'breaking';

create index protheus_dict_history_user_idx
  on public.protheus_dict_history (user_id, detected_at desc);

alter table public.protheus_dict_history enable row level security;

create policy dict_history_owner_select on public.protheus_dict_history
  for select using (
    user_id = auth.uid()
    and tenant_id = public.auth_tenant_id()
    and public.user_belongs_to_tenant(tenant_id)
  );

create policy dict_history_admin_select on public.protheus_dict_history
  for select using (
    tenant_id = public.auth_tenant_id()
    and public.is_tenant_admin(tenant_id)
  );

create policy dict_history_owner_insert on public.protheus_dict_history
  for insert
  with check (
    user_id = auth.uid()
    and tenant_id = public.auth_tenant_id()
    and public.user_belongs_to_tenant(tenant_id)
  );

-- UPDATE e DELETE não têm policy → bloqueados por RLS (append-only).
