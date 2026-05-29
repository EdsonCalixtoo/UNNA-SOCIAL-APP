-- Ativa as extensões necessárias para requisições HTTP e Cron Jobs
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cria um Cron Job para executar toda Quinta-Feira às 18:00 (Fuso horário UTC)
-- '0 18 * * 4' = Minuto 0, Hora 18, Qualquer dia do mês, Qualquer mês, Dia da semana 4 (Quinta)
SELECT cron.schedule(
  'smart-recommendations-thursday', -- Nome do job
  '0 18 * * 4', -- Expressão CRON (toda quinta às 18h)
  $$
    SELECT net.http_post(
      url:='https://brcshofygapysytsxhcy.supabase.co/functions/v1/smart-recommendations',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3Nob2Z5Z2FweXN5dHN4aGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDI0NzAsImV4cCI6MjA3ODMxODQ3MH0.32KwIa89o0RNCDfbdkD9WOu36Hae_3scA3caCoLwn3o"}'::jsonb
    );
  $$
);
