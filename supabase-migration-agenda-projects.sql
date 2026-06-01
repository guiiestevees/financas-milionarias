-- Migration: Projetos da Agenda — agrupa tarefas em pastas.
-- Tarefa com project_id NULL = avulsa.
-- Roda APÓS supabase-migration-agenda-tasks.sql

CREATE TABLE IF NOT EXISTS agenda_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'cyan',
  icon text NULL,                                  -- emoji opcional pro projeto
  notes text NULL,                                 -- descrição/objetivo do projeto
  archived_at timestamptz NULL,                    -- projeto arquivado (NULL = ativo)
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_projects_user
  ON agenda_projects(user_id, archived_at, created_at DESC);

ALTER TABLE agenda_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_projects_owner_all" ON agenda_projects;
CREATE POLICY "agenda_projects_owner_all" ON agenda_projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_agenda_projects_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agenda_projects_updated_at ON agenda_projects;
CREATE TRIGGER agenda_projects_updated_at
  BEFORE UPDATE ON agenda_projects
  FOR EACH ROW
  EXECUTE FUNCTION set_agenda_projects_updated_at();

-- Adiciona project_id em agenda_tasks (NULL = tarefa avulsa)
ALTER TABLE agenda_tasks
  ADD COLUMN IF NOT EXISTS project_id uuid NULL
  REFERENCES agenda_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_tasks_project
  ON agenda_tasks(project_id, completed_at);
