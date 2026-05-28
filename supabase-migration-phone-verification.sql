-- Migration: verificação de conta por WhatsApp (com fallback email)
-- Cria a tabela de códigos de verificação + adiciona account_verified_at em user_profiles
-- Rode no SQL Editor do Supabase APÓS desligar "Confirm email" em Auth Settings.

-- 1) Coluna no user_profiles que marca conta verificada (por qualquer meio)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS account_verified_at timestamptz;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS verification_method text;  -- 'whatsapp' | 'email' | null

-- Marca usuários ANTIGOS como já verificados (eles já passaram pelo email confirm)
-- Senão eles vão ser bloqueados ao abrir o app depois desse deploy.
UPDATE user_profiles
SET account_verified_at = COALESCE(account_verified_at, NOW()),
    verification_method = COALESCE(verification_method, 'legacy')
WHERE EXISTS (
  SELECT 1 FROM auth.users u
  WHERE u.id = user_profiles.user_id
    AND u.email_confirmed_at IS NOT NULL
);

-- 2) Tabela de códigos de verificação
CREATE TABLE IF NOT EXISTS phone_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,            -- sha256 do código 6 dígitos
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0, -- tentativas de validar o código
  send_count integer NOT NULL DEFAULT 1, -- quantas vezes o código foi enviado hoje
  last_sent_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  -- contador diário pra rate limit (zera todo dia via job ou no proximo envio)
  send_count_day date NOT NULL DEFAULT CURRENT_DATE
);

-- RLS: ninguém acessa essa tabela direto. Só o service_role do backend.
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
-- (sem policies = ninguém com anon_key consegue ler/escrever)

-- 3) Index pra cleanup de códigos antigos (opcional, mas saudável)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires
  ON phone_verifications(expires_at);

-- Como rodar limpeza periódica (opcional, ative se quiser):
-- DELETE FROM phone_verifications WHERE expires_at < NOW() - interval '7 days';
