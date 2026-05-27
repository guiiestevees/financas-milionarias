-- ================================================================
-- Migration: rastreamento de notificações de cobrança
-- Evita spam de WhatsApp/email quando múltiplos pagamentos vencem
-- ================================================================

-- Quando foi a última notificação de PAYMENT_OVERDUE pra esse usuário
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_overdue_notice_at TIMESTAMPTZ;

-- Qual payment_id já foi notificado (dedup pra retries do webhook)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_overdue_payment_id TEXT;
