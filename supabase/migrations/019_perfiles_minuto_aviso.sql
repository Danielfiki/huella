-- ============================================
-- Migration 019 -- perfiles.minuto_aviso
--
-- POR QUE: las tres opciones que aprobo Design son 9:00, 14:00 y 21:30. La
-- tercera NO cabe en `hora_aviso`, que es smallint de horas enteras.
--
-- Se evaluaron tres salidas y esta es la unica honesta:
--
--   a) Guardar 21 y que el cron lo trate como 21:30 con un caso especial.
--      Descartada: una regla invisible escondida en el endpoint, que se rompe
--      sola el dia que alguien agregue una cuarta opcion.
--   b) Mostrar "21:00" y guardar 21. Descartada: es cambiar el copy aprobado
--      por comodidad tecnica.
--   c) Guardar el minuto. Es esta. Una columna mas, sin caso especial, y
--      soporta cualquier hora futura sin volver a tocar el esquema.
--
-- El job de pg_cron corre CADA MEDIA HORA (minutos 0 y 30) en vez de cada
-- hora, y el endpoint compara hora Y minuto contra la hora local de Chile.
--
-- ORDEN: esta migracion va ANTES del deploy del codigo. La columna nace con
-- default 0, o sea que todos los perfiles existentes quedan en su hora en
-- punto, que es exactamente lo que tienen hoy.
--
-- Idempotente. Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- ============================================

BEGIN;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS minuto_aviso smallint NOT NULL DEFAULT 0;

-- Solo en punto o y media: son los unicos minutos que el cron puede alcanzar,
-- porque corre en :00 y :30. Guardar un 17 aca seria un aviso que no sale
-- nunca, y el CHECK lo impide antes de que pase.
ALTER TABLE public.perfiles
  DROP CONSTRAINT IF EXISTS perfiles_minuto_aviso_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_minuto_aviso_check
  CHECK (minuto_aviso IN (0, 30));

COMMENT ON COLUMN public.perfiles.minuto_aviso IS
  'Minuto del aviso diario: 0 o 30, los unicos que el job de pg_cron alcanza (corre en :00 y :30). Junto con hora_aviso define la hora local exacta en America/Santiago.';

-- El filtro del cron es por las dos columnas juntas, asi que el indice tambien.
DROP INDEX IF EXISTS public.idx_perfiles_hora_aviso;
CREATE INDEX IF NOT EXISTS idx_perfiles_aviso
  ON public.perfiles(hora_aviso, minuto_aviso);

COMMIT;

-- ============================================
-- VERIFICACION (opcional, solo lectura):
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'perfiles'
--     AND column_name IN ('hora_aviso', 'minuto_aviso');
-- ============================================
