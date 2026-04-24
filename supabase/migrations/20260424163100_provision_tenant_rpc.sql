-- ============================================================================
-- BeeIT OS-RT v2 — RPC provision_tenant_protheus
-- ----------------------------------------------------------------------------
-- Operação atômica de provisionamento de um tenant:
--   1. Cria linha em tenant_protheus_config
--   2. Gera nome determinístico do secret
--   3. Grava Basic Auth (já em base64) no Supabase Vault
--   4. Atualiza basic_auth_ref na config
--   5. (Opcional) Vincula um usuário como admin do tenant
--
-- Chamado pelo scripts/setup-tenant.js com service_role.
-- Falha atômica: qualquer erro reverte todas as inserções (transação SQL).
-- ============================================================================

create or replace function public.provision_tenant_protheus(
  p_display_name     text,
  p_protheus_url     text,
  p_protheus_env     text,
  p_protheus_company text,
  p_protheus_filial  text,
  p_basic_auth_b64   text,
  p_admin_email      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, vault, auth
as $$
declare
  v_tenant_id   uuid;
  v_secret_name text;
  v_user_id     uuid;
begin
  -- Validações de entrada
  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'display_name obrigatório';
  end if;
  if p_protheus_url !~* '^https?://' then
    raise exception 'protheus_url deve começar com http:// ou https://';
  end if;
  if p_basic_auth_b64 is null or length(p_basic_auth_b64) < 4 then
    raise exception 'basic_auth_b64 inválido (mínimo 4 chars base64)';
  end if;
  -- Tenta validar que o conteúdo é base64 decodável
  begin
    perform decode(p_basic_auth_b64, 'base64');
  exception when others then
    raise exception 'basic_auth_b64 não é base64 válido';
  end;

  -- 1. Cria tenant_protheus_config com basic_auth_ref temporário "pending"
  insert into public.tenant_protheus_config
    (display_name, protheus_url, protheus_env, protheus_company, protheus_filial, basic_auth_ref)
  values
    (p_display_name, p_protheus_url, p_protheus_env, p_protheus_company, p_protheus_filial, 'pending')
  returning tenant_id into v_tenant_id;

  -- 2. Nome determinístico do secret, sem hífens no UUID para casar com padrão do Vault
  v_secret_name := 'tenant_' || replace(v_tenant_id::text, '-', '') || '_protheus_basicauth';

  -- 3. Grava no Vault. Assinatura: vault.create_secret(new_secret, new_name, new_description)
  perform vault.create_secret(
    p_basic_auth_b64,
    v_secret_name,
    'Basic Auth Protheus (base64) para tenant ' || p_display_name
  );

  -- 4. Atualiza referência
  update public.tenant_protheus_config
  set basic_auth_ref = v_secret_name
  where tenant_id = v_tenant_id;

  -- 5. Opcional: vincula admin
  if p_admin_email is not null then
    select id into v_user_id from auth.users where email = p_admin_email;
    if v_user_id is null then
      raise exception 'Usuário com email % não encontrado em auth.users. Cadastre-o primeiro.', p_admin_email;
    end if;
    insert into public.user_tenant (user_id, tenant_id, role)
    values (v_user_id, v_tenant_id, 'admin')
    on conflict (user_id, tenant_id) do update set role = 'admin';
  end if;

  return v_tenant_id;
end;
$$;

comment on function public.provision_tenant_protheus is
  'Provisiona um tenant atomicamente: cria config, grava Basic Auth no Vault e opcionalmente vincula admin. Chamado apenas por service_role.';

-- Restringe execução a service_role (nunca cliente web/app)
revoke all on function public.provision_tenant_protheus(text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.provision_tenant_protheus(text,text,text,text,text,text,text)
  to service_role;

-- ----------------------------------------------------------------------------
-- Função auxiliar para auditar/listar tenants provisionados (apenas admins
-- enxergam seus próprios tenants via RLS, mas service_role lista tudo).
-- ----------------------------------------------------------------------------

create or replace function public.list_provisioned_tenants()
returns table (
  tenant_id         uuid,
  display_name      text,
  protheus_url      text,
  basic_auth_ref    text,
  active            boolean,
  admin_count       bigint,
  created_at        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.tenant_id,
    t.display_name,
    t.protheus_url,
    t.basic_auth_ref,
    t.active,
    (select count(*) from public.user_tenant ut
      where ut.tenant_id = t.tenant_id and ut.role = 'admin') as admin_count,
    t.created_at
  from public.tenant_protheus_config t
  order by t.created_at desc;
$$;

comment on function public.list_provisioned_tenants is
  'Lista resumida de tenants para ops (uso via service_role).';

revoke all on function public.list_provisioned_tenants()
  from public, anon, authenticated;
grant execute on function public.list_provisioned_tenants()
  to service_role;
