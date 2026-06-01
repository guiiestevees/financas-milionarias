-- Migration: lembretes via Alfred (WhatsApp) pros compromissos.
-- Roda no SQL Editor do Supabase APÓS as migrations anteriores da agenda.

-- Coluna no agenda_events: quantos minutos antes avisar?
ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer DEFAULT NULL;

-- Tabela auxiliar pra controlar quais lembretes JÁ foram enviados.
-- Necessária porque eventos recorrentes precisam de 1 lembrete por
-- ocorrência (data específica) — não dá pra colocar 1 flag no evento.
CREATE TABLE IF NOT EXISTS agenda_reminders_sent (
  event_id uuid NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_agenda_reminders_sent_at ON agenda_reminders_sent(sent_at);

-- RLS na tabela auxiliar (só o backend acessa via service role, mas
-- garante via segurança que usuário não vê o de outro)
ALTER TABLE agenda_reminders_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_sent_via_event" ON agenda_reminders_sent;
CREATE POLICY "reminders_sent_via_event" ON agenda_reminders_sent
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agenda_events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );
