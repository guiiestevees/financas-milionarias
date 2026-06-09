-- Migration: salvar preferência de tema (light/dark) no perfil do usuário.
-- Permite que o tema persista entre dispositivos (não só localStorage).
--
-- Estrutura:
--   theme_prefs jsonb DEFAULT '{}'::jsonb
--   { financas: 'dark', agenda: 'light' }
--
-- Roda no SQL Editor do Supabase.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS theme_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.user_profiles.theme_prefs IS
  'Preferências de tema por app. Estrutura: { financas: "dark"|"light", agenda: "dark"|"light" }';
