-- Migration: pesquisa de saída no cancelamento de assinatura.
-- Guarda o motivo que o usuário escolheu + comentário livre opcional.
-- Útil pra entender churn e priorizar o roadmap.
--
-- Roda no SQL Editor do Supabase.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_feedback text;

COMMENT ON COLUMN public.user_profiles.cancel_reason IS
  'Motivo do cancelamento escolhido na pesquisa de saída (price, usage, missing_feature, technical, other).';

COMMENT ON COLUMN public.user_profiles.cancel_feedback IS
  'Comentário livre opcional deixado pelo usuário ao cancelar.';
