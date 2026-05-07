-- ================================================================
-- Finanças Milionárias — Migration v1
-- Run this in your Supabase project's SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- Tabela: user_profiles
-- Armazena a marca (nome + subtítulo) de cada usuário
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand     JSONB NOT NULL DEFAULT '{"name":"","subtitle":"Finanças Milionárias"}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Tabela: user_months
-- Um registro por usuário × mês (YYYY-MM)
-- A coluna data armazena { receitas, despesas, config } como JSONB
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_months (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,   -- ex: '2026-05'
  data       JSONB NOT NULL DEFAULT '{"receitas":[],"despesas":[],"config":{"cards":[],"paymentMethods":["Pix","Débito"],"categories":[],"attributedTo":[],"incomeSources":[]}}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, year_month)
);

-- Índice para busca por usuário (a query mais comum)
CREATE INDEX IF NOT EXISTS user_months_user_id_idx ON public.user_months (user_id);

-- ----------------------------------------------------------------
-- RLS — Row Level Security
-- Cada usuário vê e modifica apenas seus próprios dados
-- ----------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_months   ENABLE ROW LEVEL SECURITY;

-- user_profiles: acesso total ao próprio perfil
CREATE POLICY "profiles: own row" ON public.user_profiles
  FOR ALL USING (user_id = auth.uid());

-- user_months: acesso total aos próprios meses
CREATE POLICY "months: own rows" ON public.user_months
  FOR ALL USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- Trigger: atualiza updated_at automaticamente
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_months_updated_at
  BEFORE UPDATE ON public.user_months
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
