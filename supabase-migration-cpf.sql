-- ================================================================
-- Migration: CPF como identificador alternativo de login
-- Permite login com Email OU CPF + senha
-- ================================================================

-- CPF no formato apenas dígitos (11 caracteres pra CPF, 14 pra CNPJ)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Índice único pra busca rápida e impedir 2 contas com mesmo CPF
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_cpf_uniq
  ON public.user_profiles (cpf)
  WHERE cpf IS NOT NULL;

-- ================================================================
-- RPC pra resolver email a partir do CPF (security definer)
-- Necessária porque o cliente não-autenticado precisa fazer essa
-- consulta na hora do login. Usamos security definer + função
-- restrita pra não vazar dados.
-- ================================================================

CREATE OR REPLACE FUNCTION public.lookup_email_by_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_clean TEXT;
BEGIN
  -- Sanitiza: só dígitos
  v_clean := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');

  -- Valida tamanho mínimo
  IF length(v_clean) < 11 THEN
    RETURN NULL;
  END IF;

  -- Busca o email vinculado ao CPF
  SELECT u.email INTO v_email
  FROM public.user_profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.cpf = v_clean
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- Permite chamada por qualquer client (anônimo ou autenticado)
GRANT EXECUTE ON FUNCTION public.lookup_email_by_cpf(TEXT) TO anon, authenticated;
