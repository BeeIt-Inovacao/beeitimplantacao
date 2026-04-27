-- ============================================================================
-- BeeIT OS-RT v2 — Auth Hook v2: adiciona claim vault_alias ao JWT
-- ----------------------------------------------------------------------------
-- Substitui a função custom_access_token_hook (criada em Sprint 4 —
-- 20260424163000_auth_hook_tenant_claim.sql) por uma versão que também
-- injeta o claim vault_alias no token JWT.
--
-- vault_alias = basic_auth_ref de tenant_protheus_config
--   Permite que a Edge Function protheus-proxy leia o nome do secret no
--   Supabase Vault diretamente do JWT, sem precisar de um segundo SELECT
--   em tenant_protheus_config para resolver o alias.
--
-- Mudanças em relação à v1:
--   1. JOIN com tenant_protheus_config para ler basic_auth_ref.
--   2. Filtro active = true: tenant inativo → claims não injetados (Edge
--      retornará 403 "JWT sem claim tenant_id").
--   3. Claim adicional vault_alias (top-level + app_metadata).
--
-- Claims injetados no JWT:
--   top-level:
--     tenant_id      (uuid como string)
--     role_in_tenant (admin | operator | viewer)
--     vault_alias    (nome do secret no Vault)
--   app_metadata (acessível em policies RLS via auth.jwt()):
--     tenant_id
--     role_in_tenant
--     vault_alias
--
-- ATIVAÇÃO MANUAL OBRIGATÓRIA (este SQL não faz isso):
--   Dashboard → Authentication → Hooks → Customize Access Token
--   → Selecionar: public.custom_access_token_hook
--   (ou via supabase/config.toml [auth.hook.custom_access_token] — ver
--    docs/SUPABASE-DEPLOY-PLAN.md para o passo-a-passo completo)
--
-- Depende de:
--   20260424163000_auth_hook_tenant_claim.sql  (grants supabase_auth_admin já
--                                               existem; reafirmados abaixo)
--   20260427100000_tenant_vault_alias_trigger.sql (basic_auth_ref é determin.)
-- ============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id     uuid;
  v_tenant_id   uuid;
  v_role        text;
  v_vault_alias text;
  v_claims      jsonb;
begin
  v_user_id := (event ->> 'user_id')::uuid;
  v_claims  := coalesce(event -> 'claims', '{}'::jsonb);

  if v_user_id is null then
    return event;
  end if;

  -- Busca tenant padrão (vínculo mais antigo), role e vault_alias em um único
  -- JOIN. Filtro active = true garante que tenant inativo não injeta claims.
  select ut.tenant_id, ut.role, t.basic_auth_ref
    into v_tenant_id, v_role, v_vault_alias
  from public.user_tenant ut
  join public.tenant_protheus_config t
    on  t.tenant_id = ut.tenant_id
   and  t.active    = true
  where ut.user_id = v_user_id
  order by ut.created_at asc
  limit 1;

  if v_tenant_id is null then
    -- Usuário sem vínculo ativo: não injeta claims (Edge retornará 403).
    return event;
  end if;

  -- ── Claims top-level (lidos pela Edge Function protheus-proxy) ────────────
  v_claims := jsonb_set(v_claims, '{tenant_id}',      to_jsonb(v_tenant_id::text));
  v_claims := jsonb_set(v_claims, '{role_in_tenant}',  to_jsonb(v_role));
  v_claims := jsonb_set(v_claims, '{vault_alias}',     to_jsonb(v_vault_alias));

  -- ── app_metadata (acessível em policies RLS via auth.jwt()) ──────────────
  if v_claims -> 'app_metadata' is null then
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
  end if;
  v_claims := jsonb_set(v_claims, '{app_metadata,tenant_id}',      to_jsonb(v_tenant_id::text));
  v_claims := jsonb_set(v_claims, '{app_metadata,role_in_tenant}', to_jsonb(v_role));
  v_claims := jsonb_set(v_claims, '{app_metadata,vault_alias}',    to_jsonb(v_vault_alias));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

comment on function public.custom_access_token_hook is
  'Supabase Auth Hook v2 — injeta tenant_id, role_in_tenant e vault_alias no JWT a cada emissão. Ativar manualmente: Dashboard → Authentication → Hooks → Customize Access Token.';

-- ── Permissões ────────────────────────────────────────────────────────────────
-- supabase_auth_admin executa o hook. Grants do migration anterior são
-- reafirmados para garantir idempotência caso a ordem de aplicação varie.

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function public.user_default_tenant_id(uuid)    to supabase_auth_admin;

grant usage  on schema public                  to supabase_auth_admin;
grant select on public.user_tenant             to supabase_auth_admin;
grant select on public.tenant_protheus_config  to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
revoke execute on function public.user_default_tenant_id(uuid)    from public, anon, authenticated;
