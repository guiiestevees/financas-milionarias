-- Migration: Agenda — compromissos, lembretes, recorrência
-- Rode no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,                            -- data do compromisso (ou data de início se recorrente)
  time time NULL,                                -- hora de início (NULL = dia inteiro)
  end_time time NULL,                            -- hora de término (opcional)
  location text NULL,
  notes text NULL,
  color text NOT NULL DEFAULT 'gold',            -- 'gold' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet' | 'sky' | 'fuchsia'
  recurring text NOT NULL DEFAULT 'none',        -- 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  ends_at date NULL,                             -- data limite da recorrência (NULL = pra sempre)
  skipped_dates date[] NOT NULL DEFAULT ARRAY[]::date[],  -- dias específicos pulados (exceções)
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Índices pra busca rápida
CREATE INDEX IF NOT EXISTS idx_agenda_user_date ON agenda_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_agenda_user_recurring ON agenda_events(user_id, recurring) WHERE recurring != 'none';

-- RLS — só o dono vê/edita seus eventos
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_events_owner_all" ON agenda_events;
CREATE POLICY "agenda_events_owner_all" ON agenda_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger pra atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_agenda_events_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agenda_events_updated_at ON agenda_events;
CREATE TRIGGER agenda_events_updated_at
  BEFORE UPDATE ON agenda_events
  FOR EACH ROW
  EXECUTE FUNCTION set_agenda_events_updated_at();
