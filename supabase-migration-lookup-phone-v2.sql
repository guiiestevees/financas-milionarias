-- Migration v2: lookup_email_by_phone prioriza conta verificada
--
-- Antes: retornava a primeira conta achada com o número (podia ser ambíguo
--        se mesmo número estivesse em 2+ contas)
-- Agora: prioriza conta com account_verified_at preenchido (provou acesso).
--        Se nenhuma estiver verificada, retorna a mais recente.

CREATE OR REPLACE FUNCTION lookup_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_email text;
  clean_phone text;
BEGIN
  clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');

  IF length(clean_phone) < 10 THEN
    RETURN NULL;
  END IF;

  -- Prioriza:
  -- 1) Conta com account_verified_at preenchido (NULLS LAST = não verificada por último)
  -- 2) Conta com updated_at mais recente (mais ativa)
  SELECT u.email INTO result_email
  FROM auth.users u
  JOIN user_profiles p ON p.user_id = u.id
  WHERE p.whatsapp_phone IS NOT NULL
    AND (
      p.whatsapp_phone = clean_phone
      OR p.whatsapp_phone = '55' || clean_phone
      OR p.whatsapp_phone = substring(clean_phone from 3)
    )
  ORDER BY
    p.account_verified_at DESC NULLS LAST,
    p.updated_at DESC
  LIMIT 1;

  RETURN result_email;
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_email_by_phone(text) TO anon, authenticated;
