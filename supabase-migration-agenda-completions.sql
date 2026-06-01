-- Migration: marcar compromissos como concluídos (dopamina power!)
-- Tabela auxiliar — chave por ocorrência, pra recorrentes terem check por dia.

CREATE TABLE IF NOT EXISTS agenda_event_completions (
  event_id uuid NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_agenda_completions_user_date
  ON agenda_event_completions(user_id, occurrence_date);

ALTER TABLE agenda_event_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "completions_owner_all" ON agenda_event_completions;
CREATE POLICY "completions_owner_all" ON agenda_event_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
