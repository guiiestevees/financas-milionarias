-- Migration: etiquetas customizáveis pelo usuário pra organizar tarefas.
--
-- Estrutura:
--   user_profiles.tags_catalog jsonb DEFAULT '[]'::jsonb
--     Catálogo de etiquetas do user. Cada item: { id, name, color }
--     Ex: [{"id":"uuid","name":"Trabalho","color":"cyan"}, ...]
--
--   agenda_tasks.tags jsonb DEFAULT '[]'::jsonb
--     IDs das etiquetas aplicadas. Ex: ["uuid1","uuid2"]
--
-- Por que jsonb e não tabela relacional?
--   - Volume baixo (poucas etiquetas por user, ~10-30 no máximo)
--   - Leitura simples (sempre vem junto com a tarefa)
--   - Evita query extra / join
--   - Compatível com offline-first no futuro
--
-- Roda no SQL Editor do Supabase.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tags_catalog jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.tags_catalog IS
  'Catálogo de etiquetas customizáveis do user. Array de { id, name, color }.';

ALTER TABLE public.agenda_tasks
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.agenda_tasks.tags IS
  'IDs das etiquetas aplicadas à tarefa. Os nomes/cores ficam em user_profiles.tags_catalog.';

-- Índice GIN pra permitir filtrar tarefas por etiqueta no futuro:
--   SELECT * FROM agenda_tasks WHERE tags @> '["tag-id"]'::jsonb
CREATE INDEX IF NOT EXISTS idx_agenda_tasks_tags ON public.agenda_tasks USING gin (tags);
