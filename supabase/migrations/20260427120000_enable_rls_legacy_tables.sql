-- ============================================================================
-- HOTFIX P0 — Ativação de RLS nas tabelas legadas
-- ----------------------------------------------------------------------------
-- Habilita Row Level Security nas 4 tabelas do monólito legado que foram
-- identificadas no laudo de segurança como expostas sem RLS ativo.
--
-- Políticas existentes NÃO são alteradas — apenas a chave RLS é ligada.
-- Auth Hook suspenso manualmente no Dashboard durante o período de homologação.
--
-- Aplicar: supabase db push --project-ref dbaqvoatopfquaqgdptk
-- ============================================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_log    ENABLE ROW LEVEL SECURITY;
