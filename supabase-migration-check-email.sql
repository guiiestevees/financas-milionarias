-- ================================================================
-- Migration: RPC pra checar se email já existe (signup em tempo real)
-- Permite mostrar feedback ao usuário ASSIM que ele sair do campo
-- email/CPF, sem precisar preencher o resto do form pra descobrir.
-- ================================================================

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Sanity check
  IF p_email IS NULL OR length(trim(p_email)) < 3 THEN
    RETURN FALSE;
  END IF;

  -- Conta usuários com esse email (case-insensitive)
  SELECT COUNT(*) INTO v_count
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email));

  RETURN v_count > 0;
END;
$$;

-- Permite chamada por qualquer cliente (necessário pro signup form)
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated;
