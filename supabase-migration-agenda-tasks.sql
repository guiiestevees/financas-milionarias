-- Migration: Agenda Tasks — coisas pra fazer SEM data definida ainda.
-- Diferente de agenda_events (que têm data/hora marcada).
-- Rode no SQL Editor do Supabase APÓS as outras migrations da agenda.

CREATE TABLE IF NOT EXISTS agenda_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text NULL,
  color text NOT NULL DEFAULT 'cyan',
  priority integer NOT NULL DEFAULT 0,             -- 0 = normal, 1 = importante (vai pro topo)
  completed_at timestamptz NULL,                   -- NULL = pendente, preenchido = feita
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agenda_tasks_user_pending
  ON agenda_tasks(user_id, completed_at, priority DESC, created_at);

-- RLS — só o dono vê/edita
ALTER TABLE agenda_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_tasks_owner_all" ON agenda_tasks;
CREATE POLICY "agenda_tasks_owner_all" ON agenda_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_agenda_tasks_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agenda_tasks_updated_at ON agenda_tasks;
CREATE TRIGGER agenda_tasks_updated_at
  BEFORE UPDATE ON agenda_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_agenda_tasks_updated_at();
