-- ================================================================
-- Finanças Milionárias — Migration: Assinaturas (Asaas)
-- Adiciona campos pra controlar status de assinatura no user_profiles.
-- Run this in your Supabase project's SQL Editor.
-- Idempotente: pode rodar várias vezes sem quebrar.
-- ================================================================

-- ----------------------------------------------------------------
-- Campos novos no user_profiles
-- ----------------------------------------------------------------

-- Status da assinatura
-- Valores:
--   'trial'      → 7 dias grátis (default pra novos usuários)
--   'active'     → pagando em dia
--   'overdue'    → atrasou pagamento (3 dias de graça antes de bloquear)
--   'expired'    → trial acabou sem assinar OU atrasou mais de 3 dias
--   'cancelled'  → cancelou ativamente
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial';

-- Quando expira o acesso atual (trial OU pagamento pago)
-- Default: 7 dias a partir da criação do perfil (trial automático)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- Plano atual: 'monthly' | 'annual' | NULL (durante trial)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- IDs do Asaas pra vincular nosso usuário ao cliente/assinatura deles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- ID do último pagamento processado (idempotência do webhook)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_payment_id TEXT;

-- Quando o trial começou (pra exibir "X dias restantes" na UI)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();

-- ----------------------------------------------------------------
-- Constraint: subscription_status só aceita valores válidos
-- ----------------------------------------------------------------
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_status_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'overdue', 'expired', 'cancelled'));

-- ----------------------------------------------------------------
-- Constraint: subscription_plan só aceita valores válidos
-- ----------------------------------------------------------------
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_plan_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('monthly', 'annual'));

-- ----------------------------------------------------------------
-- Índice pra busca rápida por customer/subscription do Asaas
-- (usado no webhook quando chega evento referenciando o ID)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS user_profiles_asaas_customer_idx
  ON public.user_profiles (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_profiles_asaas_subscription_idx
  ON public.user_profiles (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

-- ----------------------------------------------------------------
-- Backfill: usuários existentes (criados antes dessa migration)
-- recebem trial de 7 dias a partir de AGORA.
-- Só atualiza quem tá com trial_started_at NULL.
-- ----------------------------------------------------------------
UPDATE public.user_profiles
SET
  trial_started_at   = COALESCE(trial_started_at, NOW()),
  subscription_until = COALESCE(subscription_until, NOW() + INTERVAL '7 days'),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE trial_started_at IS NULL
   OR subscription_until IS NULL
   OR subscription_status IS NULL;

-- ----------------------------------------------------------------
-- Pronto. Próximos passos:
-- 1. Rodar essa migration no Supabase SQL Editor
-- 2. Configurar env vars ASAAS_API_KEY e ASAAS_ENV no Vercel
-- 3. Os endpoints /api/asaas-webhook e /api/checkout fazem o resto
-- ----------------------------------------------------------------
