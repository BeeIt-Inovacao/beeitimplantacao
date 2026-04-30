-- Fix: infinite recursion detected in policy for relation "profiles"
--
-- Causa: a função public.is_admin() faz SELECT em public.profiles,
-- e profile_select_admin chama is_admin() — em PG 14+ o SECURITY DEFINER
-- não bypassa RLS por padrão, gerando recursão.
--
-- Solução: adicionar SET row_security = off à função is_admin (e outras
-- funções que leem profiles a partir de policies).

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Retorna true se o usuário autenticado é admin. row_security=off evita recursão na policy profile_select_admin.';

-- A policy profiles_admin_select tem EXISTS(SELECT FROM profiles ...) inline, que recursiva
-- contra a própria tabela. Substituímos pelo is_admin() (já com row_security=off).
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (public.is_admin());
