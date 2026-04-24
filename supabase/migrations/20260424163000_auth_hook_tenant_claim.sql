-- ============================================================================
-- BeeIT OS-RT v2 — Auth Hook: injeção de tenant_id no JWT
-- ----------------------------------------------------------------------------
-- Cria a função `public.custom_access_token_hook` que roda no momento da
-- emissão do access token (login + refresh) e injeta o tenant_id padrão
-- do usuário em app_metadata.tenant_id (e também como claim top-level
-- tenant_id para compatibilidade).
--
-- **Ativação manual obrigatória** (não faz parte deste SQL):
--   Supabase Dashboard → Authentication → Hooks → "Customize Access Token"
--     → selecionar função: public.custom_access_token_hook
--   (ou via supabase/config.toml com [auth.hook.custom_access_token])
--
-- Comportamento:
--   - Se o usuário tem vínculo em user_tenant → injeta o tenant com vínculo
--     mais antigo (menor created_at) como default.
--   - Se o usuário não tem vínculo → não injeta claim (Edge retornará 403
--     para /protheus/* por falta de tenant_id).
--   - Para suportar troca de tenant em runtime (multi-tenant users), o
--     frontend deve chamar supabase.auth.refreshSession() após mudança
--     de contexto — o hook relê a escolha padrão.
-- ============================================================================

-- Helper: retorna o tenant padrão de um usuário (primeiro vínculo por data).
create or replace function public.user_default_tenant_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.user_tenant
  where user_id = p_user_id
  order by created_at asc
  limit 1;
$$;

comment on function public.user_default_tenant_id is
  'Retorna o tenant_id padrão de um usuário (vínculo mais antigo). NULL se não há vínculo.';

-- Hook principal: chamado pelo supabase_auth_admin a cada emissão de token.
-- O evento recebe {user_id, claims, authentication_method, ...}.
-- Retornamos o mesmo evento, enriquecido com claims.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_role text;
  v_claims jsonb;
begin
  v_user_id := (event ->> 'user_id')::uuid;
  v_claims  := coalesce(event -> 'claims', '{}'::jsonb);

  if v_user_id is null then
    return event;
  end if;

  -- Busca tenant padrão + role nesse tenant.
  select ut.tenant_id, ut.role
    into v_tenant_id, v_role
  from public.user_tenant ut
  where ut.user_id = v_user_id
  order by ut.created_at asc
  limit 1;

  if v_tenant_id is null then
    -- Usuário sem vínculo: não injeta claims.
    return event;
  end if;

  -- Injeta em DOIS lugares por compatibilidade:
  -- 1) top-level claim tenant_id   (Edge Function lê como preferência)
  -- 2) app_metadata.tenant_id      (exposto via auth.jwt() no RLS)
  v_claims := jsonb_set(v_claims, '{tenant_id}', to_jsonb(v_tenant_id::text));
  v_claims := jsonb_set(v_claims, '{role_in_tenant}', to_jsonb(v_role));

  -- Garante que app_metadata existe antes de escrever dentro dele.
  if v_claims -> 'app_metadata' is null then
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
  end if;
  v_claims := jsonb_set(v_claims, '{app_metadata,tenant_id}',      to_jsonb(v_tenant_id::text));
  v_claims := jsonb_set(v_claims, '{app_metadata,role_in_tenant}', to_jsonb(v_role));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

comment on function public.custom_access_token_hook is
  'Supabase Auth Hook — injeta tenant_id (claim top-level + app_metadata) no JWT a cada emissão. Ativar manualmente no Dashboard → Authentication → Hooks.';

-- ── Permissões para o role supabase_auth_admin ──────────────────────────
-- O role supabase_auth_admin é quem executa os hooks. Precisa poder:
--   - chamar a função
--   - ler user_tenant para descobrir o tenant default
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function public.user_default_tenant_id(uuid)    to supabase_auth_admin;

-- Leitura em user_tenant — a função é SECURITY DEFINER (bypassa RLS),
-- mas o role precisa de USAGE no schema e SELECT na tabela caso a
-- definição mude no futuro. Grant defensivo:
grant usage  on schema public                   to supabase_auth_admin;
grant select on public.user_tenant              to supabase_auth_admin;
grant select on public.tenant_protheus_config   to supabase_auth_admin;

-- Revoga execução das funções auxiliares do public/anon/authenticated por
-- defesa em profundidade (não são úteis ao cliente e podem vazar linkagens).
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
revoke execute on function public.user_default_tenant_id(uuid)    from public, anon, authenticated;
