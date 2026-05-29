-- Migration: permite login por celular
-- Cria RPC que retorna o email do usuário a partir do número de celular.
-- Tolerante a formatos: aceita com/sem DDI 55, com/sem máscara.

CREATE OR REPLACE FUNCTION lookup_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_email text;
  clean_phone text;
BEGIN
  -- Normaliza pra apenas dígitos
  clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');

  -- Se vazio ou muito curto, retorna null
  IF length(clean_phone) < 10 THEN
    RETURN NULL;
  END IF;

  -- Tenta achar comparando contra:
  -- 1) Match exato (formato como tá salvo)
  -- 2) Match com DDI 55 prefixado
  -- 3) Match sem DDI 55 (se input tinha)
  SELECT u.email INTO result_email
  FROM auth.users u
  JOIN user_profiles p ON p.user_id = u.id
  WHERE p.whatsapp_phone IS NOT NULL
    AND (
      p.whatsapp_phone = clean_phone
      OR p.whatsapp_phone = '55' || clean_phone
      OR p.whatsapp_phone = substring(clean_phone from 3)
    )
  LIMIT 1;

  RETURN result_email;
END;
$$;

-- Permite chamada via anon (usado no login antes de autenticar)
GRANT EXECUTE ON FUNCTION lookup_email_by_phone(text) TO anon, authenticated;
