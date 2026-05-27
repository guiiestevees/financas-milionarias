-- ================================================================
-- Migration: rastreio de autorização Pix Automático
-- Salvamos o ID da autorização Pix Automático Bacen pra:
--   - Criar cobranças mensais futuras (cron job)
--   - Cancelar autorização quando user cancelar
-- ================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pix_automatic_authorization_id TEXT;

CREATE INDEX IF NOT EXISTS user_profiles_pix_auth_idx
  ON public.user_profiles (pix_automatic_authorization_id)
  WHERE pix_automatic_authorization_id IS NOT NULL;
