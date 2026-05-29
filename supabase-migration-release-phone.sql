-- Migration: permite "reciclar" celulares no cadastro
-- Cria RPC que remove um número de outras contas (mantém apenas na conta indicada).
-- Usada quando alguém cadastra um número que já estava em outra conta —
-- assumimos reciclagem da operadora (cliente novo é o dono atual).

CREATE OR REPLACE FUNCTION release_phone(p_phone text, p_keep_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_phone text;
  affected integer;
BEGIN
  -- Normaliza pra apenas dígitos
  clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');

  -- Se vazio ou inválido, retorna 0
  IF length(clean_phone) < 10 THEN
    RETURN 0;
  END IF;

  -- Remove o phone de outras contas (NÃO mexe na conta do p_keep_user_id)
  UPDATE user_profiles
  SET whatsapp_phone = NULL,
      updated_at = NOW()
  WHERE whatsapp_phone IS NOT NULL
    AND user_id != p_keep_user_id
    AND (
      whatsapp_phone = clean_phone
      OR whatsapp_phone = '55' || clean_phone
      OR whatsapp_phone = substring(clean_phone from 3)
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION release_phone(text, uuid) TO authenticated;
