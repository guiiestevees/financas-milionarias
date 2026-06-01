-- Migration: adiciona suporte a "dias específicos da semana" na agenda.
-- Roda no SQL Editor do Supabase APÓS a migration original da agenda.

ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS recurring_weekdays integer[] DEFAULT NULL;

-- recurring_weekdays guarda dias da semana (0=domingo, 1=segunda, ... 6=sábado)
-- Só é relevante quando recurring = 'weekdays'.
-- Exemplos:
--   [1,2,3,4,5] = segunda a sexta (dias úteis)
--   [0,6]       = sábado e domingo (fim de semana)
--   [1,3,5]     = segunda, quarta e sexta

-- Atualiza o check de tipos válidos de recurring (se quiser ser estrito):
-- 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly'
