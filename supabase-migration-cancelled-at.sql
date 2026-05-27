-- ================================================================
-- Migration: data de cancelamento da assinatura
-- Permite Alfred dizer "sua assinatura foi cancelada em X"
-- ================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;
