-- ============================================================================
-- BeeIT OS-RT v2 — Helpers de autorização multi-tenant
-- ----------------------------------------------------------------------------
-- Funções reutilizáveis por todas as policies RLS.
-- Extrai tenant_id do JWT claim e valida pertencimento do usuário ao tenant.
-- ============================================================================

-- Retorna o tenant_id do claim JWT corrente. NULL se ausente ou inválido.
create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
$$;

comment on function public.auth_tenant_id is
  'Extrai tenant_id do JWT claim. Usado em policies RLS.';

-- Defense-in-depth: valida que o user_id atual pertence ao tenant informado
-- via tabela user_tenant. Complementa o check por JWT claim (caso o claim
-- seja adulterado ou defasado após remoção de user_tenant).
create or replace function public.user_belongs_to_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenant
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
  );
$$;

comment on function public.user_belongs_to_tenant is
  'Defense-in-depth: confirma vínculo user_id × tenant_id em user_tenant.';

-- Verifica se o usuário corrente é admin do tenant informado.
-- SECURITY DEFINER bypassa RLS dentro da função, evitando recursão infinita
-- quando usada em policies de user_tenant (self-referential table).
create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenant
    where user_id = auth.uid()
      and tenant_id = p_tenant_id
      and role = 'admin'
  );
$$;

comment on function public.is_tenant_admin is
  'Retorna true se auth.uid() é admin do tenant dado. Bypassa RLS (SECURITY DEFINER) para evitar recursão em policies.';

-- Trigger helper para atualizar updated_at automaticamente em UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Trigger BEFORE UPDATE para manter updated_at.';
