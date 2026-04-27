-- ============================================================================
-- BeeIT OS-RT v2 — Trigger: auto-preenchimento de basic_auth_ref (vault alias)
-- ----------------------------------------------------------------------------
-- Garante que todo INSERT em tenant_protheus_config receba um basic_auth_ref
-- determinístico derivado do tenant_id (UUID primary key), quando o campo não
-- for fornecido ou vier como NULL / '' / 'pending'.
--
-- Formato: tenant_<uuid_sem_hifens>_protheus_basicauth
-- Exemplo: tenant_4a5b6c7d8e9f4a5b6c7d8e9f4a5b6c7d_protheus_basicauth
--
-- Este padrão espelha a convenção já usada em provision_tenant_rpc
-- (20260424163100_provision_tenant_rpc.sql). O trigger enforça a convenção
-- no nível do banco, eliminando a etapa INSERT-pending → UPDATE e protegendo
-- contra inserções manuais fora do RPC.
--
-- Comportamento em BEFORE INSERT:
--   - Se basic_auth_ref é NULL, '' ou 'pending' → sobrescreve com alias auto.
--   - Se basic_auth_ref já tem valor real (ex: inserção com nome customizado)
--     → mantém o valor fornecido sem alteração.
--
-- Compatibilidade retroativa:
--   provision_tenant_rpc insere com basic_auth_ref = 'pending' e depois faz
--   UPDATE para o alias determinístico. Com este trigger, o INSERT já grava
--   o alias final e o UPDATE torna-se um no-op (mesmo valor). Sem breaking change.
--
-- Depende de: 20260424155200_schema_multitenant.sql
-- ============================================================================

create or replace function public.set_tenant_vault_alias()
returns trigger
language plpgsql
as $$
begin
  -- O DEFAULT gen_random_uuid() é avaliado pelo PostgreSQL ANTES do BEFORE
  -- trigger, portanto new.tenant_id já está preenchido neste ponto.
  if new.basic_auth_ref is null or trim(new.basic_auth_ref) in ('', 'pending') then
    new.basic_auth_ref :=
      'tenant_' || replace(new.tenant_id::text, '-', '') || '_protheus_basicauth';
  end if;
  return new;
end;
$$;

comment on function public.set_tenant_vault_alias is
  'Trigger BEFORE INSERT em tenant_protheus_config: preenche basic_auth_ref com alias determinístico do Vault quando ausente ou "pending".';

create trigger tenant_protheus_config_set_vault_alias
  before insert on public.tenant_protheus_config
  for each row execute function public.set_tenant_vault_alias();
