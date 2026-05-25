-- ================================================================
-- Finanças Milionárias — Migration v2 (hardened RLS)
-- Run this in your Supabase project's SQL Editor.
-- Idempotente: pode rodar várias vezes sem quebrar.
-- ================================================================

-- ----------------------------------------------------------------
-- Tabela: user_profiles
-- Marca + cofres de cada usuário (1 row por user)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand      JSONB NOT NULL DEFAULT '{"name":"","subtitle":"Finanças Milionárias"}',
  cofres     JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que a coluna cofres existe em bancos antigos
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cofres JSONB NOT NULL DEFAULT '[]';

-- ----------------------------------------------------------------
-- Tabela: user_months
-- 1 row por usuário × mês (YYYY-MM). JSONB com receitas/despesas/config.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_months (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{"receitas":[],"despesas":[],"config":{"cards":[],"paymentMethods":["Pix","Débito"],"categories":[],"attributedTo":[],"incomeSources":[]}}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, year_month)
);

-- Valida formato YYYY-MM no year_month (defesa contra corrupção)
ALTER TABLE public.user_months
  DROP CONSTRAINT IF EXISTS user_months_year_month_format;
ALTER TABLE public.user_months
  ADD CONSTRAINT user_months_year_month_format
  CHECK (year_month ~ '^\d{4}-\d{2}$');

CREATE INDEX IF NOT EXISTS user_months_user_id_idx ON public.user_months (user_id);

-- ----------------------------------------------------------------
-- RLS — Row Level Security
-- Cada usuário só vê/edita os próprios dados.
-- Policies separadas por comando pra clareza e defesa em profundidade.
-- ----------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_months   ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas (idempotente)
DROP POLICY IF EXISTS "profiles: own row"           ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: select own"        ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: insert own"        ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: update own"        ON public.user_profiles;
DROP POLICY IF EXISTS "profiles: delete own"        ON public.user_profiles;
DROP POLICY IF EXISTS "months: own rows"            ON public.user_months;
DROP POLICY IF EXISTS "months: select own"          ON public.user_months;
DROP POLICY IF EXISTS "months: insert own"          ON public.user_months;
DROP POLICY IF EXISTS "months: update own"          ON public.user_months;
DROP POLICY IF EXISTS "months: delete own"          ON public.user_months;

-- user_profiles
CREATE POLICY "profiles: select own" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles: insert own" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles: update own" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles: delete own" ON public.user_profiles
  FOR DELETE USING (user_id = auth.uid());

-- user_months
CREATE POLICY "months: select own" ON public.user_months
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "months: insert own" ON public.user_months
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "months: update own" ON public.user_months
  FOR UPDATE USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());

CREATE POLICY "months: delete own" ON public.user_months
  FOR DELETE USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- Revoga acesso default do anon a tabelas user_*.
-- Sem isso, qualquer nova tabela criada no public schema fica
-- automaticamente acessível pelo anon (default do PG).
-- ----------------------------------------------------------------
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_months   FROM anon;

-- O role 'authenticated' continua precisando acesso (filtrado pela RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_months   TO authenticated;

-- ----------------------------------------------------------------
-- Trigger: updated_at automático
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_months_updated_at ON public.user_months;
CREATE TRIGGER user_months_updated_at
  BEFORE UPDATE ON public.user_months
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- Sanity check — rode após aplicar pra confirmar:
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname='public' AND tablename IN ('user_profiles','user_months');
--   -- Deve retornar rowsecurity = true nas duas linhas.
--
--   SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies WHERE schemaname='public'
--   ORDER BY tablename, cmd;
--   -- Deve listar 4 policies por tabela (SELECT, INSERT, UPDATE, DELETE).
-- ================================================================
