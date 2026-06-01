-- Migration: Cron de lembretes via pg_cron (confiável, dentro do Supabase)
-- Substitui o GitHub Action (que tava rodando só 3x/dia em vez de 288x).
--
-- IMPORTANTE: Antes de rodar, garante que:
-- 1) Você está no plano Pro do Supabase (já está)
-- 2) Vai precisar trocar 'COLAR_CRON_SECRET_AQUI' pelo seu CRON_SECRET real

-- Habilita as extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Remove job antigo se existir (idempotente — pode rodar várias vezes)
SELECT cron.unschedule('agenda-reminders-every-5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agenda-reminders-every-5min');

-- Agenda: chama o endpoint a cada 5 minutos
SELECT cron.schedule(
  'agenda-reminders-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://meudomus.com/api/agenda-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 4c8f087448c2ee18b05c708eab0329176d8557747a7d251ce8500326a597f75a'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) AS request_id;
  $$
);

-- Verifica que foi criado
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'agenda-reminders-every-5min';
